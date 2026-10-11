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
  // Empresa cujo endereço originou o cadastro — carimbada no token pra
  // sessão única funcionar por padaria, não globalmente (ver jwt.ts).
  empresaId: z.string().uuid().optional(),
  // Checkbox obrigatório no cadastro (ver login.tsx) — backend também exige,
  // não só o front, já que é a prova de consentimento LGPD que fica
  // registrada (ver consentimento_lgpd_em em clienteAuth.repository.ts).
  aceitouPrivacidade: z
    .boolean()
    .refine((v) => v === true, { message: "É preciso aceitar a política de privacidade para criar a conta." }),
});

const loginSchema = z.object({
  cpf: z.string().min(11),
  senha: z.string().min(6),
  empresaId: z.string().uuid().optional(),
});

const esqueciSenhaSchema = z.object({
  cpf: z.string().min(11),
});

const cpfExisteSchema = z.object({
  cpf: z.string().min(11),
});

const redefinirSenhaSchema = z.object({
  token: z.string().min(10),
  novaSenha: z.string().min(8),
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

  async sair(req: Request, res: Response) {
    if (!req.clienteAuth) throw AppError.unauthorized();
    await clienteAuthService.sair(req.clienteAuth.clienteId, req.clienteAuth.empresaId);
    res.status(204).send();
  },

  async cpfExiste(req: Request, res: Response) {
    const { cpf } = cpfExisteSchema.parse(req.query);
    res.status(200).json({ existe: await clienteAuthService.cpfExiste(cpf) });
  },

  async esqueciSenha(req: Request, res: Response) {
    const { cpf } = esqueciSenhaSchema.parse(req.body);
    res.status(200).json(await clienteAuthService.esqueciSenha(cpf));
  },

  async redefinirSenha(req: Request, res: Response) {
    const { token, novaSenha } = redefinirSenhaSchema.parse(req.body);
    res.status(200).json(await clienteAuthService.redefinirSenha(token, novaSenha));
  },
};
