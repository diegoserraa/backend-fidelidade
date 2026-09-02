import { query } from "../../config/db";

export interface UsuarioRow {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  papel: "gestor" | "atendente";
  status: string;
  created_at: Date;
}

export const usuariosRepository = {
  async list(empresaId: string): Promise<UsuarioRow[]> {
    const { rows } = await query<UsuarioRow>(
      `SELECT id, empresa_id, nome, email, papel, status, created_at
         FROM usuario WHERE empresa_id = $1 ORDER BY created_at DESC`,
      [empresaId]
    );
    return rows;
  },

  async findById(empresaId: string, id: string): Promise<UsuarioRow | null> {
    const { rows } = await query<UsuarioRow>(
      `SELECT id, empresa_id, nome, email, papel, status, created_at
         FROM usuario WHERE empresa_id = $1 AND id = $2`,
      [empresaId, id]
    );
    return rows[0] ?? null;
  },

  async create(empresaId: string, dados: { nome: string; email: string; senhaHash: string; papel: "gestor" | "atendente" }) {
    const { rows } = await query<UsuarioRow>(
      `INSERT INTO usuario (empresa_id, nome, email, senha_hash, papel)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, empresa_id, nome, email, papel, status, created_at`,
      [empresaId, dados.nome, dados.email, dados.senhaHash, dados.papel]
    );
    return rows[0];
  },

  async update(empresaId: string, id: string, dados: { nome?: string; email?: string; papel?: "gestor" | "atendente" }) {
    const { rows } = await query<UsuarioRow>(
      `UPDATE usuario
          SET nome = COALESCE($3, nome),
              email = COALESCE($4, email),
              papel = COALESCE($5, papel),
              updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING id, empresa_id, nome, email, papel, status, created_at`,
      [empresaId, id, dados.nome ?? null, dados.email ?? null, dados.papel ?? null]
    );
    return rows[0] ?? null;
  },

  async updateStatus(empresaId: string, id: string, status: "ativo" | "inativo") {
    const { rows } = await query<UsuarioRow>(
      `UPDATE usuario SET status = $3, updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING id, empresa_id, nome, email, papel, status, created_at`,
      [empresaId, id, status]
    );
    return rows[0] ?? null;
  },

  async remove(empresaId: string, id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM usuario WHERE empresa_id = $1 AND id = $2`, [
      empresaId,
      id,
    ]);
    return (rowCount ?? 0) > 0;
  },
};
