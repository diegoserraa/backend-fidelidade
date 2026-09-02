import { AppError } from "../../utils/AppError";
import { recompensasRepository } from "./recompensas.repository";

export const recompensasService = {
  async list(empresaId: string) {
    const rows = await recompensasRepository.list(empresaId);
    return rows.map(mapRecompensa);
  },

  async getById(empresaId: string, id: string) {
    const recompensa = await recompensasRepository.findById(empresaId, id);
    if (!recompensa) throw AppError.notFound("Recompensa");
    return mapRecompensa(recompensa);
  },

  async create(empresaId: string, dados: { titulo: string; descricao?: string; custoPontos: number }) {
    const recompensa = await recompensasRepository.create(empresaId, dados);
    return mapRecompensa(recompensa);
  },

  async update(
    empresaId: string,
    id: string,
    dados: { titulo?: string; descricao?: string; custoPontos?: number }
  ) {
    const recompensa = await recompensasRepository.update(empresaId, id, dados);
    if (!recompensa) throw AppError.notFound("Recompensa");
    return mapRecompensa(recompensa);
  },

  async updateStatus(empresaId: string, id: string, status: "ativa" | "inativa") {
    const recompensa = await recompensasRepository.updateStatus(empresaId, id, status);
    if (!recompensa) throw AppError.notFound("Recompensa");
    return mapRecompensa(recompensa);
  },

  async remove(empresaId: string, id: string) {
    try {
      const ok = await recompensasRepository.remove(empresaId, id);
      if (!ok) throw AppError.notFound("Recompensa");
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23503") {
        throw new AppError(
          "Essa recompensa já foi resgatada por clientes. Inative-a em vez de excluir.",
          409
        );
      }
      throw err;
    }
  },
};

function mapRecompensa(row: {
  id: string;
  titulo: string;
  descricao: string | null;
  custo_pontos: number;
  status: string;
  created_at: Date;
}) {
  return {
    id: row.id,
    titulo: row.titulo,
    descricao: row.descricao,
    custoPontos: row.custo_pontos,
    status: row.status,
    createdAt: row.created_at,
  };
}
