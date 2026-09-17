import { query } from "../../config/db";

export interface ClienteRow {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  senha_hash: string | null;
  sessao_versao: number;
  created_at: Date;
}

export const clienteAuthRepository = {
  async findByCpf(cpf: string): Promise<ClienteRow | null> {
    const { rows } = await query<ClienteRow>(
      `SELECT id, nome, cpf, email, telefone, senha_hash, sessao_versao, created_at
         FROM cliente WHERE cpf = $1 LIMIT 1`,
      [cpf]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<ClienteRow | null> {
    const { rows } = await query<ClienteRow>(
      `SELECT id, nome, cpf, email, telefone, senha_hash, sessao_versao, created_at
         FROM cliente WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  },

  async create(dados: {
    nome: string;
    cpf: string;
    senhaHash: string;
    telefone: string | null;
    email: string | null;
  }): Promise<ClienteRow> {
    const { rows } = await query<ClienteRow>(
      `INSERT INTO cliente (nome, cpf, senha_hash, telefone, email)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nome, cpf, email, telefone, senha_hash, sessao_versao, created_at`,
      [dados.nome, dados.cpf, dados.senhaHash, dados.telefone, dados.email]
    );
    return rows[0];
  },

  /** Define/atualiza a senha de um cliente que já existe (ex.: criado no balcão). */
  async setSenha(id: string, senhaHash: string): Promise<void> {
    await query(`UPDATE cliente SET senha_hash = $2, updated_at = now() WHERE id = $1`, [id, senhaHash]);
  },

  /**
   * Sessão única: incrementa a versão a cada login/cadastro, invalidando
   * qualquer token emitido antes (ver clienteAuth.middleware.ts). Retorna a
   * nova versão, já usada pra assinar o token desta sessão.
   */
  async incrementarSessao(id: string): Promise<number> {
    const { rows } = await query<{ sessao_versao: number }>(
      `UPDATE cliente SET sessao_versao = sessao_versao + 1 WHERE id = $1 RETURNING sessao_versao`,
      [id]
    );
    return rows[0].sessao_versao;
  },

  async sessaoVersaoAtual(id: string): Promise<number | null> {
    const { rows } = await query<{ sessao_versao: number }>(
      `SELECT sessao_versao FROM cliente WHERE id = $1`,
      [id]
    );
    return rows[0]?.sessao_versao ?? null;
  },

  /** Exclui a conta do cliente. Cascata apaga vínculos, compras, resgates e
   *  movimentações em todas as empresas (LGPD — direito à exclusão). */
  async deleteById(id: string): Promise<boolean> {
    const { rowCount } = await query(`DELETE FROM cliente WHERE id = $1`, [id]);
    return (rowCount ?? 0) > 0;
  },
};
