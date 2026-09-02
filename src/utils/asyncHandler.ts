import { NextFunction, Request, Response } from "express";

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Evita repetir try/catch em cada controller: qualquer erro (síncrono ou
 * assíncrono) lançado dentro de `fn` é encaminhado para o error middleware.
 */
export function asyncHandler(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
