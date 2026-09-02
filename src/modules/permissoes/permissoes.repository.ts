import { query, withTransaction } from "../../config/db";
import { Recurso } from "./permissoes.types";

export const permissoesRepository = {
  async listByUsuario(usuarioId: string): Promise<Recurso[]> {
    const { rows } = await query<{ recurso: Recurso }>(
      `SELECT recurso FROM usuario_permissao WHERE usuario_id = $1 ORDER BY recurso ASC`,
      [usuarioId]
    );
    return rows.map((r) => r.recurso);
  },

  async hasPermissao(usuarioId: string, recurso: Recurso): Promise<boolean> {
    const { rows } = await query(
      `SELECT 1 FROM usuario_permissao WHERE usuario_id = $1 AND recurso = $2 LIMIT 1`,
      [usuarioId, recurso]
    );
    return rows.length > 0;
  },

  /** Sobrescreve o conjunto de permissões do usuário (delete + insert atômico). */
  async setForUsuario(usuarioId: string, recursos: Recurso[]): Promise<void> {
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM usuario_permissao WHERE usuario_id = $1`, [usuarioId]);
      for (const recurso of recursos) {
        await client.query(
          `INSERT INTO usuario_permissao (usuario_id, recurso) VALUES ($1, $2)`,
          [usuarioId, recurso]
        );
      }
    });
  },

  async clearForUsuario(usuarioId: string): Promise<void> {
    await query(`DELETE FROM usuario_permissao WHERE usuario_id = $1`, [usuarioId]);
  },
};
