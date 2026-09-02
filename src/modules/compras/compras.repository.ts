import { PoolClient } from "pg";
import { query, withTransaction } from "../../config/db";

export interface CompraRow {
  id: string;
  empresa_id: string;
  cliente_empresa_id: string;
  usuario_id: string | null;
  valor: string;
  pontos_gerados: number;
  idempotency_key: string | null;
  created_at: Date;
}

export const comprasRepository = {
  async findByIdempotencyKey(empresaId: string, idempotencyKey: string): Promise<CompraRow | null> {
    const { rows } = await query<CompraRow>(
      `SELECT * FROM compra WHERE empresa_id = $1 AND idempotency_key = $2`,
      [empresaId, idempotencyKey]
    );
    return rows[0] ?? null;
  },

  async list(empresaId: string, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const [dataResult, countResult] = await Promise.all([
      query<CompraRow>(
        `SELECT * FROM compra WHERE empresa_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [empresaId, pageSize, offset]
      ),
      query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM compra WHERE empresa_id = $1`, [empresaId]),
    ]);
    return { rows: dataResult.rows, total: Number(countResult.rows[0].total) };
  },

  async findById(empresaId: string, id: string): Promise<CompraRow | null> {
    const { rows } = await query<CompraRow>(`SELECT * FROM compra WHERE empresa_id = $1 AND id = $2`, [
      empresaId,
      id,
    ]);
    return rows[0] ?? null;
  },

  /**
   * Cria a compra, credita os pontos e registra a movimentação de auditoria
   * em UMA ÚNICA transação. Usa SELECT ... FOR UPDATE no saldo do cliente
   * para evitar condição de corrida entre compras simultâneas do mesmo cliente.
   */
  async registrarCompraComPontos(params: {
    empresaId: string;
    clienteEmpresaId: string;
    usuarioId: string | null;
    valor: number;
    pontosGerados: number;
    idempotencyKey: string | null;
  }): Promise<CompraRow> {
    return withTransaction(async (client: PoolClient) => {
      const saldoAtual = await client.query<{ saldo_pontos: number }>(
        `SELECT saldo_pontos FROM cliente_empresa
          WHERE id = $1 AND empresa_id = $2
          FOR UPDATE`,
        [params.clienteEmpresaId, params.empresaId]
      );

      if (saldoAtual.rowCount === 0) {
        throw new Error("CLIENTE_EMPRESA_NAO_ENCONTRADO");
      }

      const novoSaldo = saldoAtual.rows[0].saldo_pontos + params.pontosGerados;

      const compraResult = await client.query<CompraRow>(
        `INSERT INTO compra (empresa_id, cliente_empresa_id, usuario_id, valor, pontos_gerados, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          params.empresaId,
          params.clienteEmpresaId,
          params.usuarioId,
          params.valor,
          params.pontosGerados,
          params.idempotencyKey,
        ]
      );
      const compra = compraResult.rows[0];

      await client.query(
        `UPDATE cliente_empresa SET saldo_pontos = $1, updated_at = now() WHERE id = $2`,
        [novoSaldo, params.clienteEmpresaId]
      );

      if (params.pontosGerados > 0) {
        await client.query(
          `INSERT INTO movimentacao_pontos
             (empresa_id, cliente_empresa_id, tipo, origem, origem_id, pontos, saldo_apos)
           VALUES ($1, $2, 'entrada', 'compra', $3, $4, $5)`,
          [params.empresaId, params.clienteEmpresaId, compra.id, params.pontosGerados, novoSaldo]
        );
      }

      return compra;
    });
  },
};
