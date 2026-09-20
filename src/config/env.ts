import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

const jwtSecret = required("JWT_SECRET");
if (jwtSecret.length < 32) {
  throw new Error(
    "JWT_SECRET fraco demais (mínimo 32 caracteres). Gere um novo, ex.: " +
      "`node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"`."
  );
}

// Origens liberadas para o navegador chamar a API (painel + app do cliente).
// Lista separada por vírgula, ex.: "https://painel.suapadaria.com,https://app.suapadaria.com".
// Sem essa variável, libera geral (só para desenvolvimento local).
const corsOriginsRaw = (process.env.CORS_ORIGINS ?? "").trim();
const corsOrigins = corsOriginsRaw ? corsOriginsRaw.split(",").map((o) => o.trim()) : null;

// Push notifications (Web Push/VAPID). Opcional: sem as duas chaves, o envio
// de campanhas fica desativado e avisa no log em vez de quebrar o servidor.
const vapidPublicKey = (process.env.VAPID_PUBLIC_KEY ?? "").trim() || null;
const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim() || null;
const vapidSubject = (process.env.VAPID_SUBJECT ?? "").trim() || "mailto:contato@example.com";

// E-mail transacional (Resend) — usado só pra recuperação de senha do cliente.
// Opcional: sem a chave, o link de redefinição vai pro log em vez de e-mail
// de verdade (útil em dev; em produção sem isso configurado, ninguém recebe
// o link, mas o servidor não quebra).
const resendApiKey = (process.env.RESEND_API_KEY ?? "").trim() || null;
const emailFrom = (process.env.EMAIL_FROM ?? "").trim() || null;
// URL base do app do cliente (sem barra no final), usada pra montar o link
// de redefinição de senha, ex.: "https://app.fidelizamais.com.br".
const appClienteUrl = (process.env.APP_CLIENTE_URL ?? "").trim().replace(/\/$/, "") || null;

export const env = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  corsOrigins,
  vapidPublicKey,
  vapidPrivateKey,
  vapidSubject,
  resendApiKey,
  emailFrom,
  appClienteUrl,
};
