import { AppError } from "../../utils/AppError";
import { verifyResgateToken } from "../../utils/purposeToken";
import { clientesRepository } from "../clientes/clientes.repository";
import { recompensasRepository } from "../recompensas/recompensas.repository";
import { resgatesRepository, ResgateRow } from "./resgates.repository";

export interface RegistrarResgateInput {
  empresaId: string;
  usuarioId: string;
  clienteEmpresaId: string;
  recompensaId: string;
  idempotencyKey?: string;
}

export const resgatesService = {
  async registrar(input: RegistrarResgateInput) {
    if (input.idempotencyKey) {
      const existente = await resgatesRepository.findByIdempotencyKey(input.empresaId, input.idempotencyKey);
      if (existente) return mapResgate(existente);
    }

    const cliente = await clientesRepository.findByIdInEmpresa(input.empresaId, input.clienteEmpresaId);
    if (!cliente) throw AppError.notFound("Cliente");
    if (cliente.status !== "ativo") throw new AppError("Cliente inativo nesta empresa.", 409);

    const recompensa = await recompensasRepository.findById(input.empresaId, input.recompensaId);
    if (!recompensa) throw AppError.notFound("Recompensa");
    if (recompensa.status !== "ativa") throw new AppError("Recompensa indisponível.", 409);

    try {
      const resgate = await resgatesRepository.registrarResgate({
        empresaId: input.empresaId,
        clienteEmpresaId: input.clienteEmpresaId,
        recompensaId: input.recompensaId,
        usuarioId: input.usuarioId,
        custoPontos: recompensa.custo_pontos,
        idempotencyKey: input.idempotencyKey ?? null,
      });
      return mapResgate(resgate);
    } catch (err) {
      throw traduzErro(err);
    }
  },

  /** Balcão: lê o QR do resgate e devolve o que o atendente precisa conferir. */
  async validar(empresaId: string, token: string) {
    let resgateId: string;
    let empresaDoToken: string;
    try {
      ({ resgateId, empresaId: empresaDoToken } = verifyResgateToken(token));
    } catch {
      throw new AppError("QR de resgate inválido ou expirado.", 422);
    }
    if (empresaDoToken !== empresaId) throw AppError.notFound("Resgate");

    await resgatesRepository.expirarSeVencido(empresaId, resgateId);
    const row = await resgatesRepository.findParaValidacao(empresaId, resgateId);
    if (!row) throw AppError.notFound("Resgate");

    return {
      resgateId: row.id,
      status: row.status,
      cliente: { nome: row.cliente_nome },
      recompensa: { titulo: row.recompensa_titulo, custoPontos: row.pontos_utilizados },
      saldoPontos: row.saldo_pontos,
      saldoSuficiente: row.saldo_pontos >= row.pontos_utilizados,
      expiraEm: row.expira_em,
    };
  },

  async confirmar(empresaId: string, usuarioId: string, resgateId: string) {
    try {
      const { resgate, novoSaldo } = await resgatesRepository.confirmarPendente({
        empresaId,
        resgateId,
        usuarioId,
      });
      return { resgate: mapResgate(resgate), novoSaldo };
    } catch (err) {
      throw traduzErro(err);
    }
  },

  async recusar(empresaId: string, resgateId: string) {
    const ok = await resgatesRepository.recusar(empresaId, resgateId);
    if (!ok) throw new AppError("Só é possível recusar um resgate pendente.", 409);
    return { resgateId, status: "cancelado" as const };
  },

  async list(empresaId: string, page: number, pageSize: number, status?: string) {
    const { rows, total } = await resgatesRepository.list(empresaId, page, pageSize, status);
    return { data: rows.map(mapResgate), page, pageSize, total };
  },

  async getById(empresaId: string, id: string) {
    const resgate = await resgatesRepository.findById(empresaId, id);
    if (!resgate) throw AppError.notFound("Resgate");
    return mapResgate(resgate);
  },
};

function traduzErro(err: unknown): unknown {
  if (!(err instanceof Error)) return err;
  switch (err.message) {
    case "RESGATE_NAO_ENCONTRADO":
    case "CLIENTE_EMPRESA_NAO_ENCONTRADO":
      return AppError.notFound("Resgate");
    case "RESGATE_NAO_PENDENTE":
      return new AppError("Este resgate não está mais pendente.", 409);
    case "RESGATE_EXPIRADO":
      return new AppError("O resgate expirou. Peça para o cliente gerar outro.", 409);
    case "SALDO_INSUFICIENTE":
      return new AppError("Saldo de pontos insuficiente para essa recompensa.", 409);
    default:
      return err;
  }
}

function mapResgate(row: ResgateRow) {
  return {
    id: row.id,
    clienteEmpresaId: row.cliente_empresa_id,
    recompensaId: row.recompensa_id,
    usuarioId: row.usuario_id,
    pontosUtilizados: row.pontos_utilizados,
    status: row.status,
    expiraEm: row.expira_em,
    confirmadoEm: row.confirmado_em,
    createdAt: row.created_at,
  };
}
