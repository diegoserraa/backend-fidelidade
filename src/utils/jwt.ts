import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { AdminJwtPayload, ClienteJwtPayload, JwtPayload } from "../types";

export function signToken(dados: Omit<JwtPayload, "scope">): string {
  const payload: JwtPayload = { ...dados, scope: "usuario" };
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwtSecret, options);
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<JwtPayload>;
  if (payload.scope !== "usuario" || !payload.usuarioId || !payload.empresaId) {
    throw new Error("TOKEN_ESCOPO_INVALIDO");
  }
  return payload as JwtPayload;
}

/**
 * Sessão do cliente (app / portal). O payload não tem `empresaId` — o cliente é
 * PF e transita entre várias empresas. O campo `scope` separa este token do de
 * usuário da empresa, então um nunca é aceito no lugar do outro.
 */
export function signClienteToken(clienteId: string): string {
  const payload: ClienteJwtPayload = { clienteId, scope: "cliente" };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyClienteToken(token: string): ClienteJwtPayload {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<ClienteJwtPayload>;
  if (payload.scope !== "cliente" || !payload.clienteId) {
    throw new Error("TOKEN_ESCOPO_INVALIDO");
  }
  return { clienteId: payload.clienteId, scope: "cliente" };
}

/**
 * Sessão do dono da plataforma (super admin). Não tem empresaId — de novo,
 * `scope` separa este token dos outros dois, então nenhum passa pelo
 * middleware errado mesmo tendo assinatura válida.
 */
export function signAdminToken(adminId: string): string {
  const payload: AdminJwtPayload = { adminId, scope: "admin" };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<AdminJwtPayload>;
  if (payload.scope !== "admin" || !payload.adminId) {
    throw new Error("TOKEN_ESCOPO_INVALIDO");
  }
  return { adminId: payload.adminId, scope: "admin" };
}
