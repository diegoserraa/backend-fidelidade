import { query } from "../../config/db";

export interface VinculoRow {
  cliente_empresa_id: string;
  empresa_id: string;
  empresa_nome: string;
  saldo_pontos: number;
  status: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  cor_texto: string | null;
  cor_fundo: string | null;
  exibir_total_gasto: boolean | null;
  total_gasto: string | null;
  pontos_acumulados: string | null;
  desde: Date;
}

export interface MovimentacaoRow {
  id: string;
  tipo: "entrada" | "saida";
  origem: "compra" | "resgate" | "ajuste";
  pontos: number;
  saldo_apos: number;
  created_at: Date;
}

export interface ResgateClienteRow {
  id: string;
  empresa_id: string;
  cliente_empresa_id: string;
  recompensa_id: string;
  pontos_utilizados: number;
  status: string;
  expira_em: Date | null;
  created_at: Date;
  confirmado_em: Date | null;
  recompensa_titulo: string;
}

export const portalClienteRepository = {
  async listVinculos(clienteId: string): Promise<VinculoRow[]> {
    const { rows } = await query<VinculoRow>(
      `SELECT ce.id  AS cliente_empresa_id,
              e.id   AS empresa_id,
              e.nome AS empresa_nome,
              ce.saldo_pontos,
              ce.status,
              cfg.logo_url,
              cfg.cor_primaria,
              cfg.cor_secundaria,
              cfg.cor_texto,
              cfg.cor_fundo,
              cfg.exibir_total_gasto,
              ce.created_at AS desde,
              COALESCE((SELECT SUM(valor) FROM compra WHERE cliente_empresa_id = ce.id), 0)::text AS total_gasto,
              COALESCE((SELECT SUM(pontos) FROM movimentacao_pontos
                         WHERE cliente_empresa_id = ce.id AND tipo = 'entrada'), 0)::text AS pontos_acumulados
         FROM cliente_empresa ce
         JOIN empresa e ON e.id = ce.empresa_id
    LEFT JOIN empresa_config cfg ON cfg.empresa_id = e.id
        WHERE ce.cliente_id = $1 AND e.status = 'ativa'
        ORDER BY e.nome ASC`,
      [clienteId]
    );
    return rows;
  },

  async findVinculo(clienteId: string, empresaId: string): Promise<VinculoRow | null> {
    const { rows } = await query<VinculoRow>(
      `SELECT ce.id  AS cliente_empresa_id,
              e.id   AS empresa_id,
              e.nome AS empresa_nome,
              ce.saldo_pontos,
              ce.status,
              cfg.logo_url,
              cfg.cor_primaria,
              cfg.cor_secundaria,
              cfg.cor_texto,
              cfg.cor_fundo,
              cfg.exibir_total_gasto,
              ce.created_at AS desde,
              COALESCE((SELECT SUM(valor) FROM compra WHERE cliente_empresa_id = ce.id), 0)::text AS total_gasto,
              COALESCE((SELECT SUM(pontos) FROM movimentacao_pontos
                         WHERE cliente_empresa_id = ce.id AND tipo = 'entrada'), 0)::text AS pontos_acumulados
         FROM cliente_empresa ce
         JOIN empresa e ON e.id = ce.empresa_id
    LEFT JOIN empresa_config cfg ON cfg.empresa_id = e.id
        WHERE ce.cliente_id = $1 AND ce.empresa_id = $2 AND e.status = 'ativa'`,
      [clienteId, empresaId]
    );
    return rows[0] ?? null;
  },

  async empresaAtiva(empresaId: string): Promise<{ id: string; status: string } | null> {
    const { rows } = await query<{ id: string; status: string }>(
      `SELECT id, status FROM empresa WHERE id = $1`,
      [empresaId]
    );
    return rows[0] ?? null;
  },

  /** Cria (ou reativa) o vínculo do cliente com a empresa. Idempotente. */
  async entrarNaEmpresa(clienteId: string, empresaId: string): Promise<void> {
    await query(
      `INSERT INTO cliente_empresa (cliente_id, empresa_id, saldo_pontos, status)
       VALUES ($1, $2, 0, 'ativo')
       ON CONFLICT (cliente_id, empresa_id) DO UPDATE
          SET status = 'ativo', updated_at = now()`,
      [clienteId, empresaId]
    );
  },

  async listRecompensasAtivas(empresaId: string) {
    const { rows } = await query<{
      id: string;
      titulo: string;
      descricao: string | null;
      custo_pontos: number;
      status: string;
      created_at: Date;
    }>(
      `SELECT id, titulo, descricao, custo_pontos, status, created_at
         FROM recompensa
        WHERE empresa_id = $1 AND status = 'ativa'
        ORDER BY custo_pontos ASC`,
      [empresaId]
    );
    return rows;
  },

  async criarResgatePendente(params: {
    empresaId: string;
    clienteEmpresaId: string;
    recompensaId: string;
    custoPontos: number;
    expiraEm: Date;
  }): Promise<ResgateClienteRow> {
    const { rows } = await query<{ id: string; created_at: Date; expira_em: Date }>(
      `INSERT INTO resgate
         (empresa_id, cliente_empresa_id, recompensa_id, pontos_utilizados, status, expira_em)
       VALUES ($1, $2, $3, $4, 'pendente', $5)
       RETURNING id, created_at, expira_em`,
      [params.empresaId, params.clienteEmpresaId, params.recompensaId, params.custoPontos, params.expiraEm]
    );
    const inserido = rows[0];
    return {
      id: inserido.id,
      empresa_id: params.empresaId,
      cliente_empresa_id: params.clienteEmpresaId,
      recompensa_id: params.recompensaId,
      pontos_utilizados: params.custoPontos,
      status: "pendente",
      expira_em: inserido.expira_em,
      created_at: inserido.created_at,
      confirmado_em: null,
      recompensa_titulo: "",
    };
  },

  async findResgateDoCliente(clienteId: string, resgateId: string): Promise<ResgateClienteRow | null> {
    const { rows } = await query<ResgateClienteRow>(
      `SELECT r.id, r.empresa_id, r.cliente_empresa_id, r.recompensa_id, r.pontos_utilizados,
              r.status, r.expira_em, r.created_at, r.confirmado_em,
              rec.titulo AS recompensa_titulo
         FROM resgate r
         JOIN cliente_empresa ce ON ce.id = r.cliente_empresa_id
         JOIN recompensa rec ON rec.id = r.recompensa_id
         JOIN empresa e ON e.id = r.empresa_id
        WHERE r.id = $1 AND ce.cliente_id = $2 AND e.status = 'ativa'`,
      [resgateId, clienteId]
    );
    return rows[0] ?? null;
  },

  /** Marca como 'expirado' se ainda estiver 'pendente' e a validade tiver passado. */
  async expirarSeVencido(resgateId: string): Promise<void> {
    await query(
      `UPDATE resgate
          SET status = 'expirado'
        WHERE id = $1 AND status = 'pendente' AND expira_em IS NOT NULL AND expira_em < now()`,
      [resgateId]
    );
  },

  async listExtrato(
    clienteEmpresaId: string,
    page: number,
    pageSize: number
  ): Promise<{ rows: MovimentacaoRow[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const [dataResult, countResult] = await Promise.all([
      query<MovimentacaoRow>(
        `SELECT id, tipo, origem, pontos, saldo_apos, created_at
           FROM movimentacao_pontos
          WHERE cliente_empresa_id = $1
          ORDER BY created_at DESC
          LIMIT $2 OFFSET $3`,
        [clienteEmpresaId, pageSize, offset]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM movimentacao_pontos WHERE cliente_empresa_id = $1`,
        [clienteEmpresaId]
      ),
    ]);
    return { rows: dataResult.rows, total: Number(countResult.rows[0].total) };
  },

  async cancelarPendente(clienteId: string, resgateId: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE resgate r
          SET status = 'cancelado', cancelado_em = now()
         FROM cliente_empresa ce
        WHERE r.id = $1
          AND r.cliente_empresa_id = ce.id
          AND ce.cliente_id = $2
          AND r.status = 'pendente'`,
      [resgateId, clienteId]
    );
    return (rowCount ?? 0) > 0;
  },
};
