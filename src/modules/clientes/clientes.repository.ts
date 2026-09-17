import { query } from "../../config/db";
import { Paginacao } from "../../types";

export interface ClienteEmpresaRow {
  cliente_empresa_id: string;
  cliente_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  saldo_pontos: number;
  status: string;
  created_at: Date;
}

export interface ClienteBaseRow {
  id: string;
  nome: string;
  cpf: string | null;
  email: string | null;
  telefone: string | null;
}

export const clientesRepository = {
  async listByEmpresa(
    empresaId: string,
    { page, pageSize }: Paginacao
  ): Promise<{ rows: ClienteEmpresaRow[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const [dataResult, countResult] = await Promise.all([
      query<ClienteEmpresaRow>(
        `SELECT ce.id AS cliente_empresa_id, c.id AS cliente_id,
                COALESCE(ce.nome_local, c.nome) AS nome, c.email,
                COALESCE(ce.telefone_local, c.telefone) AS telefone,
                c.cpf, ce.saldo_pontos, ce.status, ce.created_at
           FROM cliente_empresa ce
           JOIN cliente c ON c.id = ce.cliente_id
          WHERE ce.empresa_id = $1
          ORDER BY ce.created_at DESC
          LIMIT $2 OFFSET $3`,
        [empresaId, pageSize, offset]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM cliente_empresa WHERE empresa_id = $1`,
        [empresaId]
      ),
    ]);

    return { rows: dataResult.rows, total: Number(countResult.rows[0].total) };
  },

  async findByIdInEmpresa(empresaId: string, clienteEmpresaId: string): Promise<ClienteEmpresaRow | null> {
    const { rows } = await query<ClienteEmpresaRow>(
      `SELECT ce.id AS cliente_empresa_id, c.id AS cliente_id,
              COALESCE(ce.nome_local, c.nome) AS nome, c.email,
              COALESCE(ce.telefone_local, c.telefone) AS telefone,
              c.cpf, ce.saldo_pontos, ce.status, ce.created_at
         FROM cliente_empresa ce
         JOIN cliente c ON c.id = ce.cliente_id
        WHERE ce.empresa_id = $1 AND ce.id = $2`,
      [empresaId, clienteEmpresaId]
    );
    return rows[0] ?? null;
  },

  async findClienteByCpf(cpf: string): Promise<ClienteBaseRow | null> {
    const { rows } = await query<ClienteBaseRow>(
      `SELECT id, nome, cpf, email, telefone FROM cliente WHERE cpf = $1 LIMIT 1`,
      [cpf]
    );
    return rows[0] ?? null;
  },

  async createClienteMinimo(dados: {
    nome: string;
    cpf: string;
    telefone: string | null;
  }): Promise<ClienteBaseRow> {
    const { rows } = await query<ClienteBaseRow>(
      `INSERT INTO cliente (nome, cpf, telefone)
       VALUES ($1, $2, $3)
       RETURNING id, nome, cpf, email, telefone`,
      [dados.nome, dados.cpf, dados.telefone]
    );
    return rows[0];
  },

  async findVinculo(
    empresaId: string,
    clienteId: string
  ): Promise<{ id: string; status: string } | null> {
    const { rows } = await query<{ id: string; status: string }>(
      `SELECT id, status FROM cliente_empresa WHERE empresa_id = $1 AND cliente_id = $2`,
      [empresaId, clienteId]
    );
    return rows[0] ?? null;
  },

  /**
   * Garante um vínculo cliente x empresa. Se já existe, opcionalmente reativa
   * (usado no cadastro pelo balcão); no auto-vínculo por leitura de QR o status
   * atual é preservado. `nome`/`telefone`, quando informados, viram o "apelido
   * local" desta empresa para o cliente (ver nome_local/telefone_local) — não
   * tocam no cadastro global. Retorna o id de cliente_empresa.
   */
  async criarOuReativarVinculo(
    empresaId: string,
    clienteId: string,
    reativar: boolean,
    dadosLocais?: { nome?: string; telefone?: string | null }
  ): Promise<string> {
    const { rows } = await query<{ id: string }>(
      `INSERT INTO cliente_empresa (cliente_id, empresa_id, saldo_pontos, status, nome_local, telefone_local)
       VALUES ($1, $2, 0, 'ativo', $4, $5)
       ON CONFLICT (cliente_id, empresa_id) DO UPDATE
          SET status = CASE WHEN $3 THEN 'ativo' ELSE cliente_empresa.status END,
              nome_local = COALESCE($4, cliente_empresa.nome_local),
              telefone_local = COALESCE($5, cliente_empresa.telefone_local),
              updated_at = now()
       RETURNING id`,
      [clienteId, empresaId, reativar, dadosLocais?.nome ?? null, dadosLocais?.telefone ?? null]
    );
    return rows[0].id;
  },

  /** Edita nome/telefone só para esta empresa (nome_local/telefone_local) —
   *  nunca toca no cadastro global do cliente, que é compartilhado entre
   *  padarias (ver migration 009). */
  async updateVinculoLocal(
    empresaId: string,
    clienteEmpresaId: string,
    dados: { nome?: string; telefone?: string | null }
  ): Promise<void> {
    await query(
      `UPDATE cliente_empresa
          SET nome_local = COALESCE($3, nome_local),
              telefone_local = CASE WHEN $4 THEN $5 ELSE telefone_local END,
              updated_at = now()
        WHERE empresa_id = $1 AND id = $2`,
      [empresaId, clienteEmpresaId, dados.nome ?? null, "telefone" in dados, dados.telefone ?? null]
    );
  },

  /** CPF é a chave que liga o mesmo cliente entre padarias (migration 004) —
   *  diferente de nome/telefone, uma correção aqui é global de propósito. */
  async updateClienteCpf(clienteId: string, cpf: string): Promise<ClienteBaseRow | null> {
    const { rows } = await query<ClienteBaseRow>(
      `UPDATE cliente SET cpf = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, nome, cpf, email, telefone`,
      [clienteId, cpf]
    );
    return rows[0] ?? null;
  },

  /** Remove o vínculo cliente x empresa (cascata em compra/resgate/movimentação
   *  desta empresa). O cliente global permanece — pode ter vínculo com outras. */
  async deleteVinculo(empresaId: string, clienteEmpresaId: string): Promise<boolean> {
    const { rowCount } = await query(
      `DELETE FROM cliente_empresa WHERE empresa_id = $1 AND id = $2`,
      [empresaId, clienteEmpresaId]
    );
    return (rowCount ?? 0) > 0;
  },

  async updateStatus(empresaId: string, clienteEmpresaId: string, status: "ativo" | "inativo") {
    const { rows } = await query(
      `UPDATE cliente_empresa
          SET status = $3, updated_at = now()
        WHERE empresa_id = $1 AND id = $2
        RETURNING id`,
      [empresaId, clienteEmpresaId, status]
    );
    return rows[0] ?? null;
  },

  async resumo(empresaId: string, clienteEmpresaId: string) {
    const [totais, ultimasCompras, ultimosResgates] = await Promise.all([
      query<{ total_gasto: string; qtd_compras: string }>(
        `SELECT COALESCE(SUM(valor), 0)::text AS total_gasto, COUNT(*)::text AS qtd_compras
           FROM compra
          WHERE empresa_id = $1 AND cliente_empresa_id = $2`,
        [empresaId, clienteEmpresaId]
      ),
      query(
        `SELECT id, valor, pontos_gerados, created_at
           FROM compra
          WHERE empresa_id = $1 AND cliente_empresa_id = $2
          ORDER BY created_at DESC
          LIMIT 5`,
        [empresaId, clienteEmpresaId]
      ),
      query(
        `SELECT r.id, r.pontos_utilizados, r.created_at, rec.titulo AS recompensa_titulo
           FROM resgate r
           JOIN recompensa rec ON rec.id = r.recompensa_id
          WHERE r.empresa_id = $1 AND r.cliente_empresa_id = $2
          ORDER BY r.created_at DESC
          LIMIT 5`,
        [empresaId, clienteEmpresaId]
      ),
    ]);

    return {
      totalGasto: Number(totais.rows[0].total_gasto),
      quantidadeCompras: Number(totais.rows[0].qtd_compras),
      ultimasCompras: ultimasCompras.rows,
      ultimosResgates: ultimosResgates.rows,
    };
  },
};
