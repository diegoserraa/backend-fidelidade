import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAdminToken } from "../utils/jwt";

/**
 * Espelho do authMiddleware/clienteAuthMiddleware para a sessão do dono da
 * plataforma. Popula req.adminAuth com { adminId }. Rotas de /admin (exceto
 * /admin/login) exigem isso — nunca aceitam token de usuário/cliente, mesmo
 * assinado com o mesmo segredo (o `scope` do payload garante isso).
 */
export function adminAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Token de autenticação ausente.");
  }

  try {
    req.adminAuth = verifyAdminToken(header.slice("Bearer ".length));
    next();
  } catch {
    throw AppError.unauthorized("Token inválido ou expirado.");
  }
}
