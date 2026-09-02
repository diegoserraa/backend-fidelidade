import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { clientesService } from "./clientes.service";

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const statusSchema = z.object({
  status: z.enum(["ativo", "inativo"]),
});

const enrollSchema = z.object({
  nome: z.string().min(2),
  cpf: z.string().min(11),
  telefone: z.string().min(8).optional(),
});

const identificarSchema = z
  .object({
    token: z.string().min(10).optional(),
    cpf: z.string().min(11).optional(),
  })
  .refine((v) => v.token || v.cpf, { message: "Informe o QR ou o CPF do cliente." });

const idParamSchema = z.object({ id: z.string().uuid() });

const updateSchema = z
  .object({
    nome: z.string().min(2).optional(),
    telefone: z.string().min(8).nullable().optional(),
    cpf: z.string().min(11).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nada para atualizar." });

function empresaId(req: Request): string {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.empresaId;
}

export const clientesController = {
  async list(req: Request, res: Response) {
    const paginacao = paginacaoSchema.parse(req.query);
    const resultado = await clientesService.list(empresaId(req), paginacao);
    res.status(200).json(resultado);
  },

  async create(req: Request, res: Response) {
    const dados = enrollSchema.parse(req.body);
    const cliente = await clientesService.enrollBalcao(empresaId(req), dados);
    res.status(201).json(cliente);
  },

  async identificar(req: Request, res: Response) {
    const entrada = identificarSchema.parse(req.body);
    const cliente = await clientesService.identificar(empresaId(req), entrada);
    res.status(200).json(cliente);
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const cliente = await clientesService.getById(empresaId(req), id);
    res.status(200).json(cliente);
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const dados = updateSchema.parse(req.body);
    const cliente = await clientesService.atualizar(empresaId(req), id, dados);
    res.status(200).json(cliente);
  },

  async remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await clientesService.remover(empresaId(req), id);
    res.status(204).send();
  },

  async updateStatus(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const { status } = statusSchema.parse(req.body);
    const cliente = await clientesService.updateStatus(empresaId(req), id, status);
    res.status(200).json(cliente);
  },

  async resumo(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const resumo = await clientesService.resumo(empresaId(req), id);
    res.status(200).json(resumo);
  },
};
