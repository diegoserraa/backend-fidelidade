import { query } from "../../config/db";

export interface RecompensaRow {
  id: string;
  empresa_id: string;
  titulo: string;
  descricao: string | null;
  custo_pontos: number;
  status: string;
  created_at: Date;
}

export const recompensasRepository = {
  async list(empresaId: string): Promise<RecompensaRow[]> {
    const { rows } = await query<RecompensaRow>(
      `SELECT * FROM recompensa WHERE empresa_id = $1 ORDER BY created_at DESC`,
      [empresaId]
    );
    return rows;
  },

  async findById(empresaId: string, id: string): Promise<RecompensaRow | null> {
    const { rows } = await query<RecompensaRow>(
      `SELECT * FROM recompensa WHERE empresa_id = $1 AND id = $2`,
      [empresaId, id]
    );
    return rows[0] ?? null;
  },

  async create(empresaId: string, dados: { titulo: string; descricao?: string; custoPontos: number }) {
    const { rows } = await query<RecompensaRow>(
      `INSERT INTO recompensa (empresa_id, titulo, descricao, custo_pontos)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [empresaId, dados.titulo, dados.descricao ?? null, dados.custoPontos]
    );
    return rows[0];
  },

  async update(
    empresaId: string,
    id: string,
    dados: { titulo?: string; descricao?: string; custoPontos?: number }
  ) {
    const { rows } = await query<RecompensaRow>(
      `UPDATE recompensa
          SET titulo = COALESCE($3, titulo),
              descricao = COALESCE($4, descricao),
              custo_pontos = COALESCE($5, custo_pontos),
              updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING *`,
      [empresaId, id, dados.titulo ?? null, dados.descricao ?? null, dados.custoPontos ?? null]
    );
    return rows[0] ?? null;
  },

  async updateStatus(empresaId: string, id: string, status: "ativa" | "inativa") {
    const { rows } = await query<RecompensaRow>(
      `UPDATE recompensa SET status = $3, updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING *`,
      [empresaId, id, status]
    );
    return rows[0] ?? null;
  },

  async remove(empresaId: string, id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM recompensa WHERE empresa_id = $1 AND id = $2`, [
      empresaId,
      id,
    ]);
    return (rowCount ?? 0) > 0;
  },
};
