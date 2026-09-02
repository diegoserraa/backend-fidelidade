import { query, withTransaction } from "../../config/db";

export interface SuperAdminRow {
  id: string;
  nome: string;
  email: string;
  senha_hash: string;
}

export interface EmpresaResumoRow {
  id: string;
  nome: string;
  cnpj: string;
  email: string | null;
  telefone: string | null;
  status: string;
  created_at: Date;
  usuarios: string;
  clientes: string;
}

export const adminRepository = {
  async findAdminByEmail(email: string): Promise<SuperAdminRow | null> {
    const { rows } = await query<SuperAdminRow>(
      `SELECT id, nome, email, senha_hash FROM super_admin WHERE email = $1`,
      [email]
    );
    return rows[0] ?? null;
  },

  async findAdminById(id: string): Promise<Pick<SuperAdminRow, "id" | "nome" | "email"> | null> {
    const { rows } = await query<SuperAdminRow>(
      `SELECT id, nome, email FROM super_admin WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async listEmpresas(): Promise<EmpresaResumoRow[]> {
    const { rows } = await query<EmpresaResumoRow>(
      `SELECT e.id, e.nome, e.cnpj, e.email, e.telefone, e.status, e.created_at,
              (SELECT COUNT(*) FROM usuario u WHERE u.empresa_id = e.id)::text AS usuarios,
              (SELECT COUNT(*) FROM cliente_empresa ce WHERE ce.empresa_id = e.id)::text AS clientes
         FROM empresa e
        ORDER BY e.created_at DESC`
    );
    return rows;
  },

  /** Cria a empresa e seu primeiro usuário (gestor) numa única transação. */
  async createEmpresaComGestor(
    empresa: { nome: string; cnpj: string; email?: string; telefone?: string },
    gestor: { nome: string; email: string; senhaHash: string }
  ): Promise<{ empresaId: string }> {
    return withTransaction(async (client) => {
      const { rows: empresaRows } = await client.query<{ id: string }>(
        `INSERT INTO empresa (nome, cnpj, email, telefone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [empresa.nome, empresa.cnpj, empresa.email ?? null, empresa.telefone ?? null]
      );
      const empresaId = empresaRows[0].id;

      await client.query(
        `INSERT INTO usuario (empresa_id, nome, email, senha_hash, papel)
         VALUES ($1, $2, $3, $4, 'gestor')`,
        [empresaId, gestor.nome, gestor.email, gestor.senhaHash]
      );

      return { empresaId };
    });
  },

  async updateEmpresaStatus(id: string, status: "ativa" | "inativa"): Promise<EmpresaResumoRow | null> {
    const { rows } = await query<EmpresaResumoRow>(
      `UPDATE empresa SET status = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, nome, cnpj, email, telefone, status, created_at,
                  (SELECT COUNT(*) FROM usuario u WHERE u.empresa_id = empresa.id)::text AS usuarios,
                  (SELECT COUNT(*) FROM cliente_empresa ce WHERE ce.empresa_id = empresa.id)::text AS clientes`,
      [id, status]
    );
    return rows[0] ?? null;
  },
};
