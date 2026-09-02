/**
 * Decide se a conexão com o Postgres precisa de SSL.
 *
 * Regras (primeira que casar vence):
 *   1. DATABASE_SSL=false  -> nunca usa SSL (força local)
 *   2. DATABASE_SSL=true   -> sempre usa SSL
 *   3. sslmode=require|verify-* na própria URL -> usa SSL
 *   4. host local (localhost/127.0.0.1/::1) -> sem SSL
 *   5. qualquer outro host (deploy) -> usa SSL
 *
 * Quando usa SSL, o pool passa { rejectUnauthorized: false } porque os bancos
 * gerenciados (Render, Supabase, Neon, Heroku) usam certificado de cadeia
 * própria que o Node não valida por padrão.
 *
 * Fica num arquivo à parte (sem depender de ./env) para os scripts de
 * linha de comando (migrate, create-admin) reaproveitarem sem precisar de
 * JWT_SECRET & cia. só para falar com o banco.
 */
export function precisaSsl(databaseUrl: string): boolean {
  const flag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (flag === "false" || flag === "0" || flag === "no") return false;
  if (flag === "true" || flag === "1" || flag === "yes") return true;

  if (/[?&]sslmode=(require|verify-ca|verify-full)/i.test(databaseUrl)) return true;

  return !/@(localhost|127\.0\.0\.1|\[::1\]|::1)([:/]|$)/i.test(databaseUrl);
}
