import { query } from "../../config/db";

export interface UsuarioAuthRow {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  senha_hash: string;
  papel: "gestor" | "atendente";
  status: string;
  empresa_status: string;
}

export const authRepository = {
  async findByCnpjAndEmail(cnpj: string, email: string): Promise<UsuarioAuthRow | null> {
    const { rows } = await query<UsuarioAuthRow>(
      `SELECT u.id, u.empresa_id, u.nome, u.email, u.senha_hash, u.papel, u.status,
              e.status AS empresa_status
         FROM usuario u
         JOIN empresa e ON e.id = u.empresa_id
        WHERE e.cnpj = $1 AND u.email = $2
        LIMIT 1`,
      [cnpj, email]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<UsuarioAuthRow | null> {
    const { rows } = await query<UsuarioAuthRow>(
      `SELECT id, empresa_id, nome, email, senha_hash, papel, status
         FROM usuario
        WHERE id = $1
        LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },
};
