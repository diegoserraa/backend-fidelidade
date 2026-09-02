import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Erro inesperado no pool do PostgreSQL", err);
});

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

/**
 * Executa uma sequência de operações dentro de uma única transação.
 * Se o callback lançar um erro, a transação é revertida (ROLLBACK).
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
