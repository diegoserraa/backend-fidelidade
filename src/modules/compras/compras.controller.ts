import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { comprasService } from "./compras.service";

const registrarCompraSchema = z.object({
  clienteId: z.string().uuid(), // id de cliente_empresa (vínculo cliente x empresa)
  valor: z.number().positive(),
});

const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function auth(req: Request) {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth;
}

export const comprasController = {
  async registrar(req: Request, res: Response) {
    const { empresaId, usuarioId } = auth(req);
    const input = registrarCompraSchema.parse(req.body);
    // Idempotency-Key via header é o padrão recomendado; aceitamos também no
    // body para clientes HTTP mais simples de integrar.
    const idempotencyKey =
      (req.header("Idempotency-Key") ?? (req.body as { idempotencyKey?: string }).idempotencyKey) || undefined;

    const compra = await comprasService.registrar({
      empresaId,
      usuarioId,
      clienteEmpresaId: input.clienteId,
      valor: input.valor,
      idempotencyKey,
    });
    res.status(201).json(compra);
  },

  async list(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const { page, pageSize } = paginacaoSchema.parse(req.query);
    const resultado = await comprasService.list(empresaId, page, pageSize);
    res.status(200).json(resultado);
  },

  async getById(req: Request, res: Response) {
    const { empresaId } = auth(req);
    const compra = await comprasService.getById(empresaId, req.params.id);
    res.status(200).json(compra);
  },
};
