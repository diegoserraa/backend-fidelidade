import { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "../../utils/AppError";
import { portalClienteService } from "./portalCliente.service";

const empresaIdParam = z.object({ empresaId: z.string().uuid() });
const idParam = z.object({ id: z.string().uuid() });
const solicitarSchema = z.object({ recompensaId: z.string().uuid() });
const paginacaoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
const pushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
const pushUnsubscribeSchema = z.object({ endpoint: z.string().url() });
const notificacoesSchema = z.object({ ativas: z.boolean() });

function clienteId(req: Request): string {
  if (!req.clienteAuth) throw AppError.unauthorized();
  return req.clienteAuth.clienteId;
}

export const portalClienteController = {
  async listEmpresas(req: Request, res: Response) {
    res.status(200).json(await portalClienteService.listEmpresas(clienteId(req)));
  },

  async gerarQr(req: Request, res: Response) {
    res.status(200).json(portalClienteService.gerarQr(clienteId(req)));
  },

  async entrar(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    res.status(200).json(await portalClienteService.entrar(clienteId(req), empresaId));
  },

  async listRecompensas(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    res.status(200).json(await portalClienteService.listRecompensas(clienteId(req), empresaId));
  },

  async solicitarResgate(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const { recompensaId } = solicitarSchema.parse(req.body);
    res
      .status(201)
      .json(await portalClienteService.solicitarResgate(clienteId(req), empresaId, recompensaId));
  },

  async getExtrato(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const { page, pageSize } = paginacaoSchema.parse(req.query);
    res.status(200).json(await portalClienteService.getExtrato(clienteId(req), empresaId, page, pageSize));
  },

  async getResgate(req: Request, res: Response) {
    const { id } = idParam.parse(req.params);
    res.status(200).json(await portalClienteService.getResgate(clienteId(req), id));
  },

  async cancelarResgate(req: Request, res: Response) {
    const { id } = idParam.parse(req.params);
    res.status(200).json(await portalClienteService.cancelarResgate(clienteId(req), id));
  },

  async inscreverPush(req: Request, res: Response) {
    const { endpoint, keys } = pushSubscriptionSchema.parse(req.body);
    await portalClienteService.inscreverPush(clienteId(req), {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    });
    res.status(204).send();
  },

  async desinscreverPush(req: Request, res: Response) {
    const { endpoint } = pushUnsubscribeSchema.parse(req.body);
    await portalClienteService.desinscreverPush(clienteId(req), endpoint);
    res.status(204).send();
  },

  async atualizarNotificacoes(req: Request, res: Response) {
    const { empresaId } = empresaIdParam.parse(req.params);
    const { ativas } = notificacoesSchema.parse(req.body);
    await portalClienteService.atualizarNotificacoes(clienteId(req), empresaId, ativas);
    res.status(204).send();
  },
};
