import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { permissoesRepository } from "../modules/permissoes/permissoes.repository";
import { Recurso } from "../modules/permissoes/permissoes.types";

/**
 * Restringe a rota a quem tem pelo menos um dos recursos informados (OR).
 * Gestor sempre passa (acesso total, não configurável). Deve vir depois do
 * authMiddleware, que já populou req.auth.
 *
 * Checa o banco a cada request (não confia em nada guardado no JWT) para que
 * uma permissão revogada pelo gestor tenha efeito imediato, sem esperar o
 * atendente deslogar e logar de novo.
 */
export function requirePermission(...recursos: Recurso[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) throw AppError.unauthorized();
    if (req.auth.papel === "gestor") return next();

    for (const recurso of recursos) {
      if (await permissoesRepository.hasPermissao(req.auth.usuarioId, recurso)) {
        return next();
      }
    }
    throw AppError.forbidden();
  };
}
