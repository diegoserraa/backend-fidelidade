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
 * Sessão do cliente (app / portal). O cliente é PF e pode estar vinculado a
 * várias empresas, mas cada padaria hoje é um app/origem própria (ver
 * manifest.service.ts) — então o token carimba qual empresa originou esse
 * login, e a sessão única (`sv`) é rastreada por (cliente, empresa), não
 * globalmente: logar na MESMA padaria em outro aparelho invalida esse token,
 * mas logar em OUTRA padaria não mexe nele. O campo `scope` separa este
 * token do de usuário da empresa, então um nunca é aceito no lugar do outro.
 */
export function signClienteToken(clienteId: string, sessaoVersao: number, empresaId: string | null): string {
  const payload: ClienteJwtPayload = { clienteId, scope: "cliente", sv: sessaoVersao, empresaId };
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyClienteToken(token: string): ClienteJwtPayload {
  const payload = jwt.verify(token, env.jwtSecret) as Partial<ClienteJwtPayload>;
  if (payload.scope !== "cliente" || !payload.clienteId || typeof payload.sv !== "number") {
    throw new Error("TOKEN_ESCOPO_INVALIDO");
  }
  return {
    clienteId: payload.clienteId,
    scope: "cliente",
    sv: payload.sv,
    empresaId: payload.empresaId ?? null,
  };
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
