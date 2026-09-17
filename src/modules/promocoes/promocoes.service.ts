import { AppError } from "../../utils/AppError";
import { pushEnabled, webpush } from "../../config/webpush";
import { promocoesRepository } from "./promocoes.repository";

export const promocoesService = {
  async list(empresaId: string) {
    const rows = await promocoesRepository.list(empresaId);
    return rows.map(mapPromocao);
  },

  async getById(empresaId: string, id: string) {
    const promocao = await promocoesRepository.findById(empresaId, id);
    if (!promocao) throw AppError.notFound("Promoção");
    return mapPromocao(promocao);
  },

  async create(empresaId: string, dados: { titulo: string; mensagem: string }) {
    return mapPromocao(await promocoesRepository.create(empresaId, dados));
  },

  async update(empresaId: string, id: string, dados: { titulo?: string; mensagem?: string }) {
    const promocao = await promocoesRepository.update(empresaId, id, dados);
    if (!promocao) throw AppError.notFound("Promoção");
    return mapPromocao(promocao);
  },

  async remove(empresaId: string, id: string) {
    // Soft delete: mantém histórico para métricas/auditoria (ver .status = 'inativa').
    const promocao = await promocoesRepository.softDelete(empresaId, id);
    if (!promocao) throw AppError.notFound("Promoção");
  },

  async enviar(empresaId: string, id: string) {
    const promocao = await promocoesRepository.findById(empresaId, id);
    if (!promocao) throw AppError.notFound("Promoção");
    if (promocao.status === "enviada") {
      throw new AppError("Essa promoção já foi enviada.", 409);
    }

    const subscriptions = await promocoesRepository.listPushSubscriptions(empresaId);

    if (!pushEnabled) {
      // eslint-disable-next-line no-console
      console.warn(
        `[push] VAPID não configurado — promoção "${promocao.titulo}" marcada como enviada sem notificar ${subscriptions.length} dispositivo(s).`
      );
    } else {
      const payload = JSON.stringify({ titulo: promocao.titulo, mensagem: promocao.mensagem });
      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              // Assinatura expirada/revogada no navegador do cliente — limpa.
              await promocoesRepository.removerPushSubscriptionPorEndpoint(sub.endpoint);
            } else {
              // eslint-disable-next-line no-console
              console.error(`[push] Falha ao enviar para ${sub.endpoint}:`, err);
            }
          }
        })
      );
    }

    const atualizada = await promocoesRepository.marcarEnviada(empresaId, id);
    return mapPromocao(atualizada!);
  },
};

function mapPromocao(row: {
  id: string;
  titulo: string;
  mensagem: string;
  status: string;
  enviada_em: Date | null;
  created_at: Date;
}) {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    status: row.status,
    enviadaEm: row.enviada_em,
    createdAt: row.created_at,
  };
}
