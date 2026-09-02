import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { resgatesService } from "./resgates.service";

const registrarSchema = z.object({
  clienteId: z.string().uuid(),
  recompensaId: z.string().uuid(),
});

const validarSchema = z.object({ token: z.string().min(10) });

const idParamSchema = z.object({ id: z.string().uuid() });

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["pendente", "confirmado", "expirado", "cancelado"]).optional(),
});

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export const resgatesController = {
  async registrar(req: Request, res: Response) {
    const { empresaId, usuarioId } = auth(req);
    const input = registrarSchema.parse(req.body);
    const idempotencyKey =
      (req.header("Idempotency-Key") ?? (req.body as { idempotencyKey?: string }).idempotencyKey) || undefined;

    const resgate = await resgatesService.registrar({
      empresaId,
      usuarioId,
      clienteEmpresaId: input.clienteId,
      recompensaId: input.recompensaId,
      idempotencyKey,
    });
    res.status(201).json(resgate);
  },

  async validar(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const { token } = validarSchema.parse(req.body);
    res.status(200).json(await resgatesService.validar(empresaId, token));
  },

  async confirmar(req: Request, res: Response) {
    const { empresaId, usuarioId } = auth(req);
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await resgatesService.confirmar(empresaId, usuarioId, id));
  },

  async recusar(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await resgatesService.recusar(empresaId, id));
  },

  async list(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const { page, pageSize, status } = paginacaoSchema.parse(req.query);
    res.status(200).json(await resgatesService.list(empresaId, page, pageSize, status));
  },

  async getById(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const { id } = idParamSchema.parse(req.params);
    res.status(200).json(await resgatesService.getById(empresaId, id));
  },
};
