/**
 * Cria (ou reseta a senha de) o dono da plataforma. Não há tela de cadastro
 * pra isso de propósito — é o próprio dono do sistema, não um cliente — então
 * o bootstrap é por linha de comando, igual às migrations manuais deste
 * projeto (ver memória "migrate script has no tracking").
 *
 * Uso:
 *   npx tsx scripts/create-admin.ts --nome "Fulano" --email dono@padaria.com --senha "SENHA-FORTE"
 */
import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

function arg(nome: string): string {
  const i = process.argv.indexOf(`--${nome}`);
  const valor = i >= 0 ? process.argv[i + 1] : undefined;
  if (!valor) {
    console.error(`Faltou --${nome}. Uso: npx tsx scripts/create-admin.ts --nome ... --email ... --senha ...`);
    process.exit(1);
  }
  return valor;
}

async function main() {
  const nome = arg("nome");
  const email = arg("email").toLowerCase().trim();
  const senha = arg("senha");
  if (senha.length < 6) {
    console.error("A senha precisa ter pelo menos 6 caracteres.");
    process.exit(1);
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(
    `INSERT INTO super_admin (nome, email, senha_hash)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE
        SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash, updated_at = now()
     RETURNING id, nome, email`,
    [nome, email, senhaHash]
  );

  await pool.end();
  console.log("Admin pronto:", rows[0]);
}

main().catch((err) => {
  console.error("Erro ao criar admin:", err);
  process.exit(1);
});
