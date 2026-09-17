import { query } from "../../config/db";

export interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PromocaoRow {
  id: string;
  empresa_id: string;
  titulo: string;
  mensagem: string;
  status: string;
  enviada_em: Date | null;
  created_at: Date;
}

export const promocoesRepository = {
  async list(empresaId: string): Promise<PromocaoRow[]> {
    const { rows } = await query<PromocaoRow>(
      `SELECT * FROM promocao WHERE empresa_id = $1 ORDER BY created_at DESC`,
      [empresaId]
    );
    return rows;
  },

  async findById(empresaId: string, id: string): Promise<PromocaoRow | null> {
    const { rows } = await query<PromocaoRow>(`SELECT * FROM promocao WHERE empresa_id = $1 AND id = $2`, [
      empresaId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async create(empresaId: string, dados: { titulo: string; mensagem: string }) {
    const { rows } = await query<PromocaoRow>(
      `INSERT INTO promocao (empresa_id, titulo, mensagem) VALUES ($1, $2, $3) RETURNING *`,
      [empresaId, dados.titulo, dados.mensagem]
    );
    return rows[0];
  },

  async update(empresaId: string, id: string, dados: { titulo?: string; mensagem?: string }) {
    const { rows } = await query<PromocaoRow>(
      `UPDATE promocao
          SET titulo = COALESCE($3, titulo),
              mensagem = COALESCE($4, mensagem),
              updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING *`,
      [empresaId, id, dados.titulo ?? null, dados.mensagem ?? null]
    );
    return rows[0] ?? null;
  },

  async softDelete(empresaId: string, id: string) {
    const { rows } = await query<PromocaoRow>(
      `UPDATE promocao SET status = 'inativa', updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING *`,
      [empresaId, id]
    );
    return rows[0] ?? null;
  },

  async marcarEnviada(empresaId: string, id: string) {
    const { rows } = await query<PromocaoRow>(
      `UPDATE promocao SET status = 'enviada', enviada_em = now(), updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING *`,
      [empresaId, id]
    );
    return rows[0] ?? null;
  },

  async listPushSubscriptions(empresaId: string): Promise<PushSubscriptionRow[]> {
    const { rows } = await query<PushSubscriptionRow>(
      `SELECT DISTINCT pt.endpoint, pt.p256dh, pt.auth
         FROM push_subscription pt
         JOIN cliente_empresa ce ON ce.cliente_id = pt.cliente_id
        WHERE ce.empresa_id = $1 AND ce.status = 'ativo'`,
      [empresaId]
    );
    return rows;
  },

  async removerPushSubscriptionPorEndpoint(endpoint: string): Promise<void> {
    await query(`DELETE FROM push_subscription WHERE endpoint = $1`, [endpoint]);
  },
};
