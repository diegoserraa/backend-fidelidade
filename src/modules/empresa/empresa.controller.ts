import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { empresaService } from "./empresa.service";

const empresaIdParam = z.object({ empresaId: z.string().uuid() });

const updateEmpresaSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  telefone: z.string().min(8).optional(),
});

const updateConfigSchema = z.object({
  logoUrl: z.string().url().optional(),
  corPrimaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corSecundaria: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corTexto: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  corFundo: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "cor deve estar no formato hexadecimal, ex: #FF0000")
    .optional(),
  exibirTotalGasto: z.boolean().optional(),
});

function empresaIdDoContexto(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

export const empresaController = {
  async getEmpresa(req: Request, res: Response) {
    const empresa = await empresaService.getEmpresa(empresaIdDoContexto(req));
    res.status(200).json(empresa);
  },

  async updateEmpresa(req: Request, res: Response) {
    const dados = updateEmpresaSchema.parse(req.body);
    const empresa = await empresaService.updateEmpresa(empresaIdDoContexto(req), dados);
    res.status(200).json(empresa);
  },

  async getConfig(req: Request, res: Response) {
    const config = await empresaService.getConfig(empresaIdDoContexto(req));
    res.status(200).json(config);
  },

  async updateConfig(req: Request, res: Response) {
    const dados = updateConfigSchema.parse(req.body);
    const config = await empresaService.updateConfig(empresaIdDoContexto(req), dados);
    res.status(200).json(config);
  },

  async getConfigPublica(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const config = await empresaService.getConfigPublica(empresaId);
    res.status(200).json(config);
  },
};
