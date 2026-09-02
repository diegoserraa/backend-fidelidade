import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { recompensasService } from "./recompensas.service";

const createSchema = z.object({
  titulo: z.string().min(2),
  descricao: z.string().optional(),
  custoPontos: z.number().int().positive(),
});

const updateSchema = z.object({
  titulo: z.string().min(2).optional(),
  descricao: z.string().optional(),
  custoPontos: z.number().int().positive().optional(),
});

const statusSchema = z.object({ status: z.enum(["ativa", "inativa"]) });
const idParamSchema = z.object({ id: z.string().uuid() });

function empresaId(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

export const recompensasController = {
  async list(req: Request, res: Response) {
    res.status(200).json(await recompensasService.list(empresaId(req)));
  },
  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await recompensasService.getById(empresaId(req), id));
  },
  async create(req: Request, res: Response) {
    const dados = createSchema.parse(req.body);
    res.status(201).json(await recompensasService.create(empresaId(req), dados));
  },
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const dados = updateSchema.parse(req.body);
    res.status(200).json(await recompensasService.update(empresaId(req), id, dados));
  },
  async updateStatus(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    res.status(200).json(await recompensasService.updateStatus(empresaId(req), id, status));
  },
  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await recompensasService.remove(empresaId(req), id);
    res.status(204).send();
  },
};
