import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";
import { env } from "./env";
import { precisaSsl } from "./ssl";

export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Bancos gerenciados (Render, Supabase, Neon, Heroku...) só aceitam conexão
  // SSL e apresentam um certificado de cadeia própria que o Node rejeita por
  // padrão. Sem isto, TODA query estoura ("self-signed certificate in
  // certificate chain") e as rotas que tocam o banco devolvem 500 — enquanto
  // /api/health, que não usa banco, continua 200.
  ssl: precisaSsl(env.databaseUrl) ? { rejectUnauthorized: false } : undefined,
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
