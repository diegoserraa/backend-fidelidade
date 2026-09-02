import { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";

export interface ResgateRow {
  id: string;
  empresa_id: string;
  cliente_empresa_id: string;
  recompensa_id: string;
  usuario_id: string | null;
  pontos_utilizados: number;
  idempotency_key: string | null;
  status: string;
  expira_em: Date | null;
  confirmado_em: Date | null;
  confirmado_por: string | null;
  cancelado_em: Date | null;
  created_at: Date;
}

export interface ResgateValidacaoRow extends ResgateRow {
  cliente_nome: string;
  recompensa_titulo: string;
  saldo_pontos: number;
}

export const resgatesRepository = {
  async findByIdempotencyKey(empresaId: string, idempotencyKey: string): Promise<ResgateRow | null> {
    const { rows } = await query<ResgateRow>(
      `SELECT * FROM resgate WHERE empresa_id = $1 AND idempotency_key = $2`,
      [empresaId, idempotencyKey]
    );
    return rows[0] ?? null;
  },

  async list(empresaId: string, page: number, pageSize: number, status?: string) {
    const offset = (page - 1) * pageSize;
    const filtros = status ? ` AND status = $4` : "";
    const params = status ? [empresaId, pageSize, offset, status] : [empresaId, pageSize, offset];
    const [dataResult, countResult] = await Promise.all([
      query<ResgateRow>(
        `SELECT * FROM resgate WHERE empresa_id = $1${filtros} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        params
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM resgate WHERE empresa_id = $1${
          status ? " AND status = $2" : ""
        }`,
        status ? [empresaId, status] : [empresaId]
      ),
    ]);
    return { rows: dataResult.rows, total: Number(countResult.rows[0].total) };
  },

  async findById(empresaId: string, id: string): Promise<ResgateRow | null> {
    const { rows } = await query<ResgateRow>(`SELECT * FROM resgate WHERE empresa_id = $1 AND id = $2`, [
      empresaId,
      id,
    ]);
    return rows[0] ?? null;
  },

  async findParaValidacao(empresaId: string, id: string): Promise<ResgateValidacaoRow | null> {
    const { rows } = await query<ResgateValidacaoRow>(
      `SELECT r.*, c.nome AS cliente_nome, rec.titulo AS recompensa_titulo, ce.saldo_pontos
         FROM resgate r
         JOIN cliente_empresa ce ON ce.id = r.cliente_empresa_id
         JOIN cliente c ON c.id = ce.cliente_id
         JOIN recompensa rec ON rec.id = r.recompensa_id
        WHERE r.empresa_id = $1 AND r.id = $2`,
      [empresaId, id]
    );
    return rows[0] ?? null;
  },

  async expirarSeVencido(empresaId: string, id: string): Promise<void> {
    await query(
      `UPDATE resgate
          SET status = 'expirado'
        WHERE empresa_id = $1 AND id = $2 AND status = 'pendente'
          AND expira_em IS NOT NULL AND expira_em < now()`,
      [empresaId, id]
    );
  },

  async recusar(empresaId: string, id: string): Promise<boolean> {
    const { rowCount } = await query(
      `UPDATE resgate SET status = 'cancelado', cancelado_em = now()
        WHERE empresa_id = $1 AND id = $2 AND status = 'pendente'`,
      [empresaId, id]
    );
    return (rowCount ?? 0) > 0;
  },

  /**
   * Dá baixa num resgate PENDENTE: valida status/validade/saldo sob lock de
   * linha (resgate e cliente_empresa), debita os pontos, grava a movimentação
   * de auditoria e marca o resgate como confirmado. Tudo numa transação.
   */
  async confirmarPendente(params: {
    empresaId: string;
    resgateId: string;
    usuarioId: string | null;
  }): Promise<{ resgate: ResgateRow; novoSaldo: number }> {
    return withTransaction(async (client: PoolClient) => {
      const resgateAtual = await client.query<ResgateRow>(
        `SELECT * FROM resgate WHERE id = $1 AND empresa_id = $2 FOR UPDATE`,
        [params.resgateId, params.empresaId]
      );
      if (resgateAtual.rowCount === 0) throw new Error("RESGATE_NAO_ENCONTRADO");

      const resgate = resgateAtual.rows[0];
      if (resgate.status !== "pendente") throw new Error("RESGATE_NAO_PENDENTE");
      if (resgate.expira_em && resgate.expira_em.getTime() < Date.now()) {
        await client.query(`UPDATE resgate SET status = 'expirado' WHERE id = $1`, [resgate.id]);
        throw new Error("RESGATE_EXPIRADO");
      }

      const saldoAtual = await client.query<{ saldo_pontos: number }>(
        `SELECT saldo_pontos FROM cliente_empresa WHERE id = $1 AND empresa_id = $2 FOR UPDATE`,
        [resgate.cliente_empresa_id, params.empresaId]
      );
      if (saldoAtual.rowCount === 0) throw new Error("CLIENTE_EMPRESA_NAO_ENCONTRADO");
      if (saldoAtual.rows[0].saldo_pontos < resgate.pontos_utilizados) {
        throw new Error("SALDO_INSUFICIENTE");
      }

      const novoSaldo = saldoAtual.rows[0].saldo_pontos - resgate.pontos_utilizados;

      await client.query(`UPDATE cliente_empresa SET saldo_pontos = $1, updated_at = now() WHERE id = $2`, [
        novoSaldo,
        resgate.cliente_empresa_id,
      ]);

      const atualizado = await client.query<ResgateRow>(
        `UPDATE resgate
            SET status = 'confirmado', confirmado_em = now(), confirmado_por = $2, usuario_id = COALESCE(usuario_id, $2)
          WHERE id = $1
          RETURNING *`,
        [resgate.id, params.usuarioId]
      );

      await client.query(
        `INSERT INTO movimentacao_pontos
           (empresa_id, cliente_empresa_id, tipo, origem, origem_id, pontos, saldo_apos)
         VALUES ($1, $2, 'saida', 'resgate', $3, $4, $5)`,
        [params.empresaId, resgate.cliente_empresa_id, resgate.id, resgate.pontos_utilizados, novoSaldo]
      );

      return { resgate: atualizado.rows[0], novoSaldo };
    });
  },

  /**
   * Fluxo imediato (painel): debita os pontos e cria o resgate já confirmado,
   * numa transação com lock de linha. Mantido para retrocompatibilidade.
   */
  async registrarResgate(params: {
    empresaId: string;
    clienteEmpresaId: string;
    recompensaId: string;
    usuarioId: string | null;
    custoPontos: number;
    idempotencyKey: string | null;
  }): Promise<ResgateRow> {
    return withTransaction(async (client: PoolClient) => {
      const saldoAtual = await client.query<{ saldo_pontos: number }>(
        `SELECT saldo_pontos FROM cliente_empresa WHERE id = $1 AND empresa_id = $2 FOR UPDATE`,
        [params.clienteEmpresaId, params.empresaId]
      );

      if (saldoAtual.rowCount === 0) {
        throw new Error("CLIENTE_EMPRESA_NAO_ENCONTRADO");
      }

      if (saldoAtual.rows[0].saldo_pontos < params.custoPontos) {
        throw new Error("SALDO_INSUFICIENTE");
      }

      const novoSaldo = saldoAtual.rows[0].saldo_pontos - params.custoPontos;

      const resgateResult = await client.query<ResgateRow>(
        `INSERT INTO resgate
           (empresa_id, cliente_empresa_id, recompensa_id, usuario_id, pontos_utilizados, idempotency_key, status, confirmado_em, confirmado_por)
         VALUES ($1, $2, $3, $4, $5, $6, 'confirmado', now(), $4)
         RETURNING *`,
        [
          params.empresaId,
          params.clienteEmpresaId,
          params.recompensaId,
          params.usuarioId,
          params.custoPontos,
          params.idempotencyKey,
        ]
      );
      const resgate = resgateResult.rows[0];

      await client.query(`UPDATE cliente_empresa SET saldo_pontos = $1, updated_at = now() WHERE id = $2`, [
        novoSaldo,
        params.clienteEmpresaId,
      ]);

      await client.query(
        `INSERT INTO movimentacao_pontos
           (empresa_id, cliente_empresa_id, tipo, origem, origem_id, pontos, saldo_apos)
         VALUES ($1, $2, 'saida', 'resgate', $3, $4, $5)`,
        [params.empresaId, params.clienteEmpresaId, resgate.id, params.custoPontos, novoSaldo]
      );

      return resgate;
    });
  },
};
