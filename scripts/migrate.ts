import fs from "fs";
import path from "path";
import { Pool } from "pg";
import "dotenv/config";

// Mesmo critério de src/config/ssl.ts (duplicado de propósito: script de CLI
// não deve arrastar a config da API só para falar com o banco).
function precisaSsl(url: string): boolean {
  const flag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (["false", "0", "no"].includes(flag)) return false;
  if (["true", "1", "yes"].includes(flag)) return true;
  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(url)) return true;
  return !/@(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(url);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString,
    ssl: precisaSsl(connectionString ?? "") ? { rejectUnauthorized: false } : undefined,
  });
  const migrationsDir = path.join(__dirname, "..", "migrations");
  const arquivos = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const arquivo of arquivos) {
    const sql = fs.readFileSync(path.join(migrationsDir, arquivo), "utf-8");
    // eslint-disable-next-line no-console
    console.log(`Aplicando migration: ${arquivo}`);
    await pool.query(sql);
  }

  await pool.end();
  // eslint-disable-next-line no-console
  console.log("Migrations aplicadas com sucesso.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Erro ao aplicar migrations:", err);
  process.exit(1);
});
