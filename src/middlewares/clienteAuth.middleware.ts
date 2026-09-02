import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyClienteToken } from "../utils/jwt";

/**
 * Espelho do authMiddleware para a sessão do cliente (app / portal). Popula
 * req.clienteAuth com { clienteId }. As rotas de /cliente devem filtrar SEMPRE
 * por req.clienteAuth.clienteId — nunca por um id vindo de query/params/body.
 */
export function clienteAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Token de autenticação ausente.");
  }

  try {
    req.clienteAuth = verifyClienteToken(header.slice("Bearer ".length));
    next();
  } catch {
    throw AppError.unauthorized("Token inválido ou expirado.");
  }
}
