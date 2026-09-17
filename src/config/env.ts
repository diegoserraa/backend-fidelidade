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
};
