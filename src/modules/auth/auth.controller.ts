import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { authService } from "./auth.service";

const loginSchema = z.object({
  cnpj: z.string().min(11),
  email: z.string().email(),
  senha: z.string().min(6),
});

export const authController = {
  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    const resultado = await authService.login(input);
    res.status(200).json(resultado);
  },

  async me(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const usuario = await authService.me(req.auth.usuarioId);
    res.status(200).json(usuario);
  },
};
