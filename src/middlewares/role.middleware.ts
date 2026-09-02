import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { Papel } from "../types";

/**
 * Restringe a rota a um ou mais papéis. Deve ser usado sempre depois
 * do authMiddleware, que já populou req.auth.
 */
export function requireRole(...papeis: Papel[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw AppError.unauthorized();
    }
    if (!papeis.includes(req.auth.papel)) {
      throw AppError.forbidden();
    }
    next();
  };
}
