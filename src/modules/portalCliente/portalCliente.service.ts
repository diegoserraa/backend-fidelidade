import { AppError } from "../../utils/AppError";
import { signIdentityToken, signResgateToken } from "../../utils/purposeToken";
import { recompensasRepository } from "../recompensas/recompensas.repository";
import { portalClienteRepository, ResgateClienteRow, VinculoRow } from "./portalCliente.repository";

const RESGATE_TTL_MIN = 5;

export const portalClienteService = {
  async listEmpresas(clienteId: string) {
    const vinculos = await portalClienteRepository.listVinculos(clienteId);
    return vinculos.map(mapVinculo);
  },

  /** Token curto de identidade para o app renderizar como QR no balcão. */
  gerarQr(clienteId: string) {
    return signIdentityToken(clienteId);
  },

  /** Cliente entra sozinho no programa de uma empresa (app single-tenant). */
  async entrar(clienteId: string, empresaId: string) {
    const empresa = await portalClienteRepository.empresaAtiva(empresaId);
    if (!empresa) throw AppError.notFound("Empresa");
    if (empresa.status !== "ativa") throw new AppError("Esta empresa não está ativa.", 409);

    await portalClienteRepository.entrarNaEmpresa(clienteId, empresaId);
    const vinculo = await portalClienteRepository.findVinculo(clienteId, empresaId);
    return vinculo ? mapVinculo(vinculo) : null;
  },

  async listRecompensas(clienteId: string, empresaId: string) {
    const vinculo = await exigirVinculoAtivo(clienteId, empresaId);
    const recompensas = await portalClienteRepository.listRecompensasAtivas(empresaId);
    return {
      saldoPontos: vinculo.saldo_pontos,
      recompensas: recompensas.map((r) => ({
        id: r.id,
        titulo: r.titulo,
        descricao: r.descricao,
        custoPontos: r.custo_pontos,
        resgatavel: vinculo.saldo_pontos >= r.custo_pontos,
      })),
    };
  },

  async solicitarResgate(clienteId: string, empresaId: string, recompensaId: string) {
    const vinculo = await exigirVinculoAtivo(clienteId, empresaId);

    const recompensa = await recompensasRepository.findById(empresaId, recompensaId);
    if (!recompensa) throw AppError.notFound("Recompensa");
    if (recompensa.status !== "ativa") throw new AppError("Recompensa indisponível.", 409);

    if (vinculo.saldo_pontos < recompensa.custo_pontos) {
      throw new AppError("Saldo de pontos insuficiente para essa recompensa.", 409);
    }

    let resgate: ResgateClienteRow;
    try {
      resgate = await portalClienteRepository.criarResgatePendente({
        empresaId,
        clienteEmpresaId: vinculo.cliente_empresa_id,
        recompensaId,
        custoPontos: recompensa.custo_pontos,
        expiraEm: new Date(Date.now() + RESGATE_TTL_MIN * 60_000),
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new AppError("Você já tem um resgate pendente. Conclua ou cancele antes de pedir outro.", 409);
      }
      throw err;
    }

    const { token, expiraEm } = signResgateToken(resgate.id, empresaId);
    return {
      resgateId: resgate.id,
      status: resgate.status,
      token,
      expiraEm,
      recompensa: { id: recompensa.id, titulo: recompensa.titulo, custoPontos: recompensa.custo_pontos },
      saldoPontos: vinculo.saldo_pontos,
    };
  },

  async getExtrato(clienteId: string, empresaId: string, page: number, pageSize: number) {
    const vinculo = await exigirVinculoAtivo(clienteId, empresaId);
    const { rows, total } = await portalClienteRepository.listExtrato(
      vinculo.cliente_empresa_id,
      page,
      pageSize
    );
    return {
      data: rows.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        origem: m.origem,
        pontos: m.pontos,
        saldoApos: m.saldo_apos,
        createdAt: m.created_at,
      })),
      page,
      pageSize,
      total,
    };
  },

  async getResgate(clienteId: string, resgateId: string) {
    await portalClienteRepository.expirarSeVencido(resgateId);
    const resgate = await portalClienteRepository.findResgateDoCliente(clienteId, resgateId);
    if (!resgate) throw AppError.notFound("Resgate");
    return mapResgate(resgate);
  },

  async cancelarResgate(clienteId: string, resgateId: string) {
    const ok = await portalClienteRepository.cancelarPendente(clienteId, resgateId);
    if (!ok) throw new AppError("Só é possível cancelar um resgate pendente.", 409);
    return { resgateId, status: "cancelado" as const };
  },
};

async function exigirVinculoAtivo(clienteId: string, empresaId: string): Promise<VinculoRow> {
  const vinculo = await portalClienteRepository.findVinculo(clienteId, empresaId);
  if (!vinculo) throw AppError.notFound("Vínculo com a empresa");
  if (vinculo.status !== "ativo") throw new AppError("Seu cadastro está inativo nesta empresa.", 409);
  return vinculo;
}

// Níveis de fidelidade por pontos acumulados (ganhos ao longo do tempo — nunca
// caem por resgate). Fixos por ora; dá para mover para `programa_fidelidade`.
interface Nivel {
  nome: string;
  min: number;
}
const NIVEIS: Nivel[] = [
  { nome: "Pãozinho", min: 0 },
  { nome: "Baguete", min: 300 },
  { nome: "Mestre Padeiro", min: 1200 },
];

function calcularNivel(pontosAcumulados: number) {
  let nivel: Nivel = NIVEIS[0];
  let proximoNivel: Nivel | null = NIVEIS[1] ?? null;
  for (let i = 0; i < NIVEIS.length; i++) {
    if (pontosAcumulados >= NIVEIS[i].min) {
      nivel = NIVEIS[i];
      proximoNivel = NIVEIS[i + 1] ?? null;
    }
  }
  return { nivel: { ...nivel }, proximoNivel: proximoNivel ? { ...proximoNivel } : null };
}

function mapVinculo(v: VinculoRow) {
  const pontosAcumulados = Number(v.pontos_acumulados ?? 0);
  return {
    empresaId: v.empresa_id,
    nome: v.empresa_nome,
    saldoPontos: v.saldo_pontos,
    status: v.status,
    logoUrl: v.logo_url,
    corPrimaria: v.cor_primaria,
    corSecundaria: v.cor_secundaria,
    corTexto: v.cor_texto,
    corFundo: v.cor_fundo,
    exibirTotalGasto: v.exibir_total_gasto ?? false,
    totalGasto: Number(v.total_gasto ?? 0),
    pontosAcumulados,
    desde: v.desde,
    ...calcularNivel(pontosAcumulados),
  };
}

function mapResgate(r: ResgateClienteRow) {
  return {
    id: r.id,
    empresaId: r.empresa_id,
    recompensaId: r.recompensa_id,
    recompensaTitulo: r.recompensa_titulo,
    pontosUtilizados: r.pontos_utilizados,
    status: r.status,
    expiraEm: r.expira_em,
    confirmadoEm: r.confirmado_em,
    createdAt: r.created_at,
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
