import { AppError } from "../../utils/AppError";
import { pushEnabled, webpush } from "../../config/webpush";
import { empresaRepository } from "../empresa/empresa.repository";
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

  async create(empresaId: string, dados: { titulo: string; mensagem: string; validade?: string | null }) {
    return mapPromocao(await promocoesRepository.create(empresaId, dados));
  },

  async update(
    empresaId: string,
    id: string,
    dados: { titulo?: string; mensagem?: string; validade?: string | null }
  ) {
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
    // "enviada" pode ser disparada de novo quantas vezes for preciso (ex.: lembrete
    // recorrente). Só uma campanha arquivada (inativa) fica bloqueada.
    if (promocao.status === "inativa") {
      throw new AppError("Uma promoção arquivada não pode ser enviada.", 409);
    }
    // Reenvio (lembrete recorrente) não pode escapar a validade — confere de
    // novo TODA vez que "Enviar" é clicado, não só na criação, pra pegar o
    // caso de esquecer de atualizar a data numa campanha antiga.
    if (estaVencida(promocao.validade)) {
      throw new AppError(
        `Essa promoção venceu em ${formatarData(promocao.validade!)}. Atualize a validade antes de enviar.`,
        409
      );
    }

    const subscriptions = await promocoesRepository.listPushSubscriptions(empresaId);

    let enviados = 0;
    let falhas = 0;

    if (!pushEnabled) {
      // eslint-disable-next-line no-console
      console.warn(
        `[push] VAPID não configurado — promoção "${promocao.titulo}" marcada como enviada sem notificar ${subscriptions.length} dispositivo(s).`
      );
    } else {
      // A notificação usa a logo DESTA padaria, não um ícone genérico — o
      // mesmo aparelho pode estar inscrito em várias (ver migration 011),
      // então quem manda tem que se identificar visualmente.
      const config = await empresaRepository.findConfig(empresaId);
      const payload = JSON.stringify({
        titulo: promocao.titulo,
        mensagem: promocao.mensagem,
        icone: config?.logo_url ?? null,
      });
      await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
            enviados++;
          } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              // Assinatura expirada/revogada no navegador do cliente — limpa.
              await promocoesRepository.removerPushSubscriptionPorEndpoint(sub.endpoint);
            } else {
              falhas++;
              // eslint-disable-next-line no-console
              console.error(`[push] Falha ao enviar para ${sub.endpoint}:`, err);
            }
          }
        })
      );
    }

    const atualizada = await promocoesRepository.marcarEnviada(empresaId, id);
    return {
      ...mapPromocao(atualizada!),
      push: {
        habilitado: pushEnabled,
        dispositivos: subscriptions.length,
        enviados,
        falhas,
      },
    };
  },
};

/** "Válido até" é inclusivo (a promoção ainda vale NO dia da validade) —
 *  só considera vencida a partir do dia seguinte. */
function estaVencida(validade: Date | null): boolean {
  if (!validade) return false;
  const hoje = new Date();
  const hojeUTC = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  return validade.getTime() < hojeUTC;
}

function formatarData(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function mapPromocao(row: {
  id: string;
  titulo: string;
  mensagem: string;
  status: string;
  enviada_em: Date | null;
  created_at: Date;
  validade: Date | null;
}) {
  return {
    id: row.id,
    titulo: row.titulo,
    mensagem: row.mensagem,
    status: row.status,
    enviadaEm: row.enviada_em,
    createdAt: row.created_at,
    validade: row.validade,
    vencida: estaVencida(row.validade),
  };
}
