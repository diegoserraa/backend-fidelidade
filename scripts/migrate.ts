import fs from "fs";
import path from "path";
import { Pool } from "pg";
import "dotenv/config";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
