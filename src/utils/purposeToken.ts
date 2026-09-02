import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Tokens curtos e assinados que viajam dentro de um QR code. São separados do
 * JWT de sessão (utils/jwt.ts) por causa do campo `typ`: cada verificador só
 * aceita o seu tipo, então um token de identidade nunca é aceito como token de
 * resgate nem como token de login.
 *
 *  - identidade ("id"): o app do cliente pede um a cada ~90s e o renderiza como
 *    QR; o balcão escaneia para descobrir de qual cliente se trata.
 *  - resgate ("rdm"): emitido quando o cliente solicita um resgate; o balcão
 *    escaneia para localizar o resgate pendente e dar baixa. Vale ~5 min.
 */

const IDENTITY_TTL = "90s";
const RESGATE_TTL = "5m";

interface IdentityClaims {
  typ: "id";
  sub: string; // clienteId
}

interface ResgateClaims {
  typ: "rdm";
  rid: string; // resgateId
  eid: string; // empresaId
}

export function signIdentityToken(clienteId: string): { token: string; expiraEm: string } {
  const token = jwt.sign({ typ: "id", sub: clienteId } satisfies IdentityClaims, env.jwtSecret, {
    expiresIn: IDENTITY_TTL,
  });
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, expiraEm: new Date(exp * 1000).toISOString() };
}

export function verifyIdentityToken(token: string): { clienteId: string } {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<IdentityClaims>;
  if (payload.typ !== "id" || !payload.sub) {
    throw new Error("TOKEN_TIPO_INVALIDO");
  }
  return { clienteId: payload.sub };
}

export function signResgateToken(resgateId: string, empresaId: string): { token: string; expiraEm: string } {
  const token = jwt.sign(
    { typ: "rdm", rid: resgateId, eid: empresaId } satisfies ResgateClaims,
    env.jwtSecret,
    { expiresIn: RESGATE_TTL }
  );
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, expiraEm: new Date(exp * 1000).toISOString() };
}

export function verifyResgateToken(token: string): { resgateId: string; empresaId: string } {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<ResgateClaims>;
  if (payload.typ !== "rdm" || !payload.rid || !payload.eid) {
    throw new Error("TOKEN_TIPO_INVALIDO");
  }
  return { resgateId: payload.rid, empresaId: payload.eid };
}
