import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { programaFidelidadeService } from "./programaFidelidade.service";

const nivelSchema = z.object({
  nome: z.string().trim().min(1).max(40),
  min: z.number().int().min(0),
});

const updateSchema = z
  .object({
    valorPorPonto: z.number().positive().optional(),
    pontosPorCiclo: z.number().int().positive().optional(),
    ativo: z.boolean().optional(),
    // null = volta pro padrão (ver DEFAULT_NIVEIS); array = níveis próprios.
    niveis: z.array(nivelSchema).min(1).max(10).nullable().optional(),
  })
  .refine((dados) => Object.keys(dados).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const programaFidelidadeController = {
  async get(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const regra = await programaFidelidadeService.get(req.auth.empresaId);
    res.status(200).json(regra);
  },

  async update(req: Request, res: Response) {
    if (!req.auth) throw AppError.unauthorized();
    const dados = updateSchema.parse(req.body);
    const regra = await programaFidelidadeService.update(req.auth.empresaId, dados);
    res.status(200).json(regra);
  },
};
