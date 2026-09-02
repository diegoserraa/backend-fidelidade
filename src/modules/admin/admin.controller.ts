import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { adminService } from "./admin.service";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

const createEmpresaSchema = z.object({
  nome: z.string().min(2),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ deve ter 14 dígitos numéricos."),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
  gestor: z.object({
    nome: z.string().min(2),
    email: z.string().email(),
    senha: z.string().min(8),
  }),
});

const statusSchema = z.object({ status: z.enum(["ativa", "inativa"]) });
const idParamSchema = z.object({ id: z.string().uuid() });

function adminId(req: Request): string {
  if (!req.adminAuth) throw AppError.unauthorized();
  return req.adminAuth.adminId;
}

export const adminController = {
  async login(req: Request, res: Response) {
    const { email, senha } = loginSchema.parse(req.body);
    res.status(200).json(await adminService.login(email, senha));
  },

  async me(req: Request, res: Response) {
    res.status(200).json(await adminService.me(adminId(req)));
  },

  async listEmpresas(_req: Request, res: Response) {
    res.status(200).json(await adminService.listEmpresas());
  },

  async createEmpresa(req: Request, res: Response) {
    const dados = createEmpresaSchema.parse(req.body);
    res.status(201).json(await adminService.createEmpresa(dados));
  },

  async updateEmpresaStatus(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    res.status(200).json(await adminService.updateEmpresaStatus(id, status));
  },
};
