import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { RECURSOS } from "../permissoes/permissoes.types";
import { usuariosService } from "./usuarios.service";

const permissoesSchema = z.array(z.enum(RECURSOS));

const createSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(8),
  papel: z.enum(["gestor", "atendente"]),
  permissoes: permissoesSchema.optional(),
});
const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  papel: z.enum(["gestor", "atendente"]).optional(),
});
const permissoesBodySchema = z.object({ permissoes: permissoesSchema });
const statusSchema = z.object({ status: z.enum(["ativo", "inativo"]) });
const idParamSchema = z.object({ id: z.string().uuid() });

function empresaId(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export const usuariosController = {
  async list(req: Request, res: Response) {
    res.status(200).json(await usuariosService.list(empresaId(req)));
  },
  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await usuariosService.getById(empresaId(req), id));
  },
  async create(req: Request, res: Response) {
    const dados = createSchema.parse(req.body);
    res.status(201).json(await usuariosService.create(empresaId(req), dados));
  },
  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const dados = updateSchema.parse(req.body);
    res.status(200).json(await usuariosService.update(empresaId(req), id, dados));
  },
  async updateStatus(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    res.status(200).json(await usuariosService.updateStatus(empresaId(req), id, status));
  },
  async remove(req: Request, res: Response) {
    const { empresaId: eid, usuarioId } = auth(req);
    const { id } = idParamSchema.parse(req.params);
    await usuariosService.remove(eid, id, usuarioId);
    res.status(204).send();
  },
  async setPermissoes(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { permissoes } = permissoesBodySchema.parse(req.body);
    res.status(200).json(await usuariosService.setPermissoes(empresaId(req), id, permissoes));
  },
};
