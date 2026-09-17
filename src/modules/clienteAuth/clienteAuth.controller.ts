import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { clienteAuthService } from "./clienteAuth.service";

const registrarSchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().min(11),
  senha: z.string().min(8),
  telefone: z.string().min(8).optional(),
  email: z.string().email().optional(),
});

const loginSchema = z.object({
  cpf: z.string().min(11),
  senha: z.string().min(6),
});

export const clienteAuthController = {
  async registrar(req: Request, res: Response) {
    const input = registrarSchema.parse(req.body);
    res.status(201).json(await clienteAuthService.registrar(input));
  },

  async login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    res.status(200).json(await clienteAuthService.login(input));
  },

  async me(req: Request, res: Response) {
    if (!req.clienteAuth) throw AppError.unauthorized();
    res.status(200).json(await clienteAuthService.me(req.clienteAuth.clienteId));
  },

  async excluirConta(req: Request, res: Response) {
    if (!req.clienteAuth) throw AppError.unauthorized();
    await clienteAuthService.excluirConta(req.clienteAuth.clienteId);
    res.status(204).send();
  },

  async sair(req: Request, res: Response) {
    if (!req.clienteAuth) throw AppError.unauthorized();
    await clienteAuthService.sair(req.clienteAuth.clienteId);
    res.status(204).send();
  },
};
