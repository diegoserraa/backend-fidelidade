/**
 * Aplica o SEED de teste (empresa + gestor + cliente + recompensa) no banco
 * apontado por DATABASE_URL, sem depender de `psql` instalado.
 *
 * Uso:
 *   npx tsx scripts/seed.ts
 *
 * Rode DEPOIS das migrations. É idempotente (os INSERT usam ON CONFLICT).
 *
 * Credenciais criadas (batem com src/testes/00-seed.sql):
 *   painel  -> cnpj 12345678000199 | gestor@padariateste.com | 123456
 *   cliente -> cpf  52998224725    | 123456
 */
import fs from "fs";
import path from "path";
import { Pool } from "pg";
import "dotenv/config";

function precisaSsl(url: string): boolean {
  const flag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (["false", "0", "no"].includes(flag)) return false;
  if (["true", "1", "yes"].includes(flag)) return true;
  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(url)) return true;
  return !/@(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(url);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "src", "testes", "00-seed.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  const pool = new Pool({
    connectionString,
    ssl: precisaSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  await pool.query(sql);
  await pool.end();
  console.log("Seed aplicado. Login do painel: gestor@padariateste.com / 123456 (cnpj 12345678000199).");
}

main().catch((err) => {
  console.error("Erro ao aplicar o seed:", err);
  process.exit(1);
});
