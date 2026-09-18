import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { promocoesService } from "./promocoes.service";

const createSchema = z.object({
  titulo: z.string().min(2),
  mensagem: z.string().min(2),
  validade: z.string().date().nullable().optional(),
});
const updateSchema = z.object({
  titulo: z.string().min(2).optional(),
  mensagem: z.string().min(2).optional(),
  validade: z.string().date().nullable().optional(),
});
const idParamSchema = z.object({ id: z.string().uuid() });

function empresaId(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

export const promocoesController = {
  async list(req: Request, res: Response) {
    res.status(200).json(await promocoesService.list(empresaId(req)));
  },
  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await promocoesService.getById(empresaId(req), id));
  },
  async create(req: Request, res: Response) {
    const dados = createSchema.parse(req.body);
    res.status(201).json(await promocoesService.create(empresaId(req), dados));
  },
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const dados = updateSchema.parse(req.body);
    res.status(200).json(await promocoesService.update(empresaId(req), id, dados));
  },
  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await promocoesService.remove(empresaId(req), id);
    res.status(204).send();
  },
  async enviar(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await promocoesService.enviar(empresaId(req), id));
  },
};
