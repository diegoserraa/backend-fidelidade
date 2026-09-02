import { AppError } from "../../utils/AppError";
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

    const tokens = await promocoesRepository.listPushTokens(empresaId);

    // TODO: integrar com um provider real (FCM/OneSignal/etc). Por ora,
    // apenas loga e marca como enviada - suficiente para o MVP validar o fluxo.
    // eslint-disable-next-line no-console
    console.log(`[push] Enviando promoção "${promocao.titulo}" para ${tokens.length} dispositivo(s).`);

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
