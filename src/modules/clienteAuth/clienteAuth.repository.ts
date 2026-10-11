import { query } from "../../config/db";

export interface ClienteRow {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
  senha_hash: string | null;
  created_at: Date;
}

/** Usado quando não dá pra identificar a empresa no momento do login (ex.:
 *  acesso direto pelo domínio base, sem subdomínio nem ?empresa=) — não pode
 *  ser NULL porque é parte da chave primária de cliente_sessao. */
const EMPRESA_SENTINELA = "00000000-0000-0000-0000-000000000000";

export const clienteAuthRepository = {
  async findByCpf(cpf: string): Promise<ClienteRow | null> {
    const { rows } = await query<ClienteRow>(
      `SELECT id, nome, cpf, email, telefone, senha_hash, created_at
         FROM cliente WHERE cpf = $1 LIMIT 1`,
      [cpf]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<ClienteRow | null> {
    const { rows } = await query<ClienteRow>(
      `SELECT id, nome, cpf, email, telefone, senha_hash, created_at
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
      `INSERT INTO cliente (nome, cpf, senha_hash, telefone, email, consentimento_lgpd_em)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING id, nome, cpf, email, telefone, senha_hash, created_at`,
      [dados.nome, dados.cpf, dados.senhaHash, dados.telefone, dados.email]
    );
    return rows[0];
  },

  /** Define/atualiza a senha de um cliente que já existe (ex.: criado no
   *  balcão) — também carimba o consentimento LGPD, já que esse é o momento
   *  em que essa pessoa aceita a política pela primeira vez (antes disso ela
   *  nem tinha acesso de login, só existia como cadastro feito pelo balcão). */
  async setSenha(id: string, senhaHash: string): Promise<void> {
    await query(
      `UPDATE cliente SET senha_hash = $2, consentimento_lgpd_em = now(), updated_at = now() WHERE id = $1`,
      [id, senhaHash]
    );
  },

  /**
   * Sessão única POR PADARIA: incrementa a versão de (cliente, empresa) a
   * cada login/cadastro NESSA empresa, invalidando só os tokens emitidos
   * antes PRA ELA (ver clienteAuth.middleware.ts) — cada padaria é um
   * app/origem própria agora (ver manifest.service.ts), então logar na
   * padaria B não pode derrubar a sessão já aberta na padaria A no mesmo
   * aparelho. Retorna a nova versão, já usada pra assinar o token.
   */
  async incrementarSessao(clienteId: string, empresaId: string | null): Promise<number> {
    const { rows } = await query<{ versao: number }>(
      `INSERT INTO cliente_sessao (cliente_id, empresa_id, versao)
       VALUES ($1, $2, 1)
       ON CONFLICT (cliente_id, empresa_id) DO UPDATE SET versao = cliente_sessao.versao + 1, updated_at = now()
       RETURNING versao`,
      [clienteId, empresaId ?? EMPRESA_SENTINELA]
    );
    return rows[0].versao;
  },

  async sessaoVersaoAtual(clienteId: string, empresaId: string | null): Promise<number | null> {
    const { rows } = await query<{ versao: number }>(
      `SELECT versao FROM cliente_sessao WHERE cliente_id = $1 AND empresa_id = $2`,
      [clienteId, empresaId ?? EMPRESA_SENTINELA]
    );
    return rows[0]?.versao ?? null;
  },

  async salvarTokenReset(id: string, tokenHash: string, expiraEm: Date): Promise<void> {
    await query(
      `UPDATE cliente SET reset_senha_token_hash = $2, reset_senha_expira_em = $3, updated_at = now() WHERE id = $1`,
      [id, tokenHash, expiraEm]
    );
  },

  /** Só acha o cliente se o token bater E ainda não tiver expirado. */
  async findByResetTokenHash(tokenHash: string): Promise<ClienteRow | null> {
    const { rows } = await query<ClienteRow>(
      `SELECT id, nome, cpf, email, telefone, senha_hash, created_at
         FROM cliente
        WHERE reset_senha_token_hash = $1 AND reset_senha_expira_em > now()
        LIMIT 1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  /** Define a nova senha e invalida o token no mesmo update — uso único. */
  async redefinirSenhaComToken(id: string, senhaHash: string): Promise<void> {
    await query(
      `UPDATE cliente
          SET senha_hash = $2,
              reset_senha_token_hash = NULL,
              reset_senha_expira_em = NULL,
              updated_at = now()
        WHERE id = $1`,
      [id, senhaHash]
    );
  },

};
