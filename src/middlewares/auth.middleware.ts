import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyToken } from "../utils/jwt";
import { empresaRepository } from "../modules/empresa/empresa.repository";

/**
 * Extrai e valida o Bearer token, populando req.auth com
 * { usuarioId, empresaId, papel }. Todas as rotas protegidas devem
 * usar SEMPRE req.auth.empresaId para filtrar dados - nunca um
 * empresaId vindo de query/params/body.
 *
 * Também confere se a empresa continua ativa a cada request — não só no
 * login. Sem isso, o dono da plataforma inativa uma empresa em /admin e ela
 * continua funcionando normalmente pra quem já tinha um token válido (até
 * 8h). A consulta é um SELECT por chave primária, indexado e barato.
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Token de autenticação ausente.");
  }

  const token = header.slice("Bearer ".length);

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw AppError.unauthorized("Token inválido ou expirado.");
  }
  req.auth = payload;

  empresaRepository
    .findById(payload.empresaId)
    .then((empresa) => {
      if (!empresa || empresa.status !== "ativa") {
        next(AppError.forbidden("Esta empresa está inativa. Fale com o suporte."));
        return;
      }
      next();
    })
    .catch(next);
}
