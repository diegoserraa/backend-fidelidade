import { AppError } from "../../utils/AppError";
import { clientesRepository } from "../clientes/clientes.repository";
import { programaFidelidadeService } from "../programaFidelidade/programaFidelidade.service";
import { comprasRepository } from "./compras.repository";

export interface RegistrarCompraInput {
  empresaId: string;
  usuarioId: string;
  clienteEmpresaId: string;
  valor: number;
  idempotencyKey?: string;
}

export const comprasService = {
  async registrar(input: RegistrarCompraInput) {
    // Idempotência: se já existe uma compra com essa chave para essa empresa,
    // devolve o registro existente em vez de gerar pontos duas vezes.
    if (input.idempotencyKey) {
      const existente = await comprasRepository.findByIdempotencyKey(input.empresaId, input.idempotencyKey);
      if (existente) return mapCompra(existente);
    }

    const cliente = await clientesRepository.findByIdInEmpresa(input.empresaId, input.clienteEmpresaId);
    if (!cliente) throw AppError.notFound("Cliente");
    if (cliente.status !== "ativo") {
      throw new AppError("Cliente inativo nesta empresa.", 409);
    }

    const pontosGerados = await programaFidelidadeService.calcularPontos(input.empresaId, input.valor);

    try {
      const compra = await comprasRepository.registrarCompraComPontos({
        empresaId: input.empresaId,
        clienteEmpresaId: input.clienteEmpresaId,
        usuarioId: input.usuarioId,
        valor: input.valor,
        pontosGerados,
        idempotencyKey: input.idempotencyKey ?? null,
      });
      return mapCompra(compra);
    } catch (err) {
      if (err instanceof Error && err.message === "CLIENTE_EMPRESA_NAO_ENCONTRADO") {
        throw AppError.notFound("Cliente");
      }
      throw err;
    }
  },

  async list(empresaId: string, page: number, pageSize: number) {
    const { rows, total } = await comprasRepository.list(empresaId, page, pageSize);
    return { data: rows.map(mapCompra), page, pageSize, total };
  },

  async getById(empresaId: string, id: string) {
    const compra = await comprasRepository.findById(empresaId, id);
    if (!compra) throw AppError.notFound("Compra");
    return mapCompra(compra);
  },
};

function mapCompra(row: {
  id: string;
  cliente_empresa_id: string;
  usuario_id: string | null;
  valor: string;
  pontos_gerados: number;
  created_at: Date;
}) {
  return {
    id: row.id,
    clienteEmpresaId: row.cliente_empresa_id,
    usuarioId: row.usuario_id,
    valor: Number(row.valor),
    pontosGerados: row.pontos_gerados,
    createdAt: row.created_at,
  };
}
