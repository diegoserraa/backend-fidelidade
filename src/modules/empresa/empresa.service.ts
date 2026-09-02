import { AppError } from "../../utils/AppError";
import { empresaRepository } from "./empresa.repository";

export const empresaService = {
  async getEmpresa(empresaId: string) {
    const empresa = await empresaRepository.findById(empresaId);
    if (!empresa) throw AppError.notFound("Empresa");
    return empresa;
  },

  async updateEmpresa(empresaId: string, dados: { nome?: string; email?: string; telefone?: string }) {
    await this.getEmpresa(empresaId); // garante que existe
    return empresaRepository.update(empresaId, dados);
  },

  async getConfig(empresaId: string) {
    const config = await empresaRepository.findConfig(empresaId);
    // Se a empresa ainda não configurou nada, devolve os defaults sem 404 -
    // simplifica o front, que sempre recebe um objeto de config.
    return (
      config ?? {
        empresa_id: empresaId,
        logo_url: null,
        cor_primaria: "#000000",
        cor_secundaria: "#FFFFFF",
        cor_texto: "#FFFFFF",
        cor_fundo: "#FFFFFF",
        exibir_total_gasto: true,
      }
    );
  },

  /**
   * Identidade visual pública de uma empresa (sem autenticação) — usada pelo
   * app do cliente para já pintar a tela de login com a marca configurada no
   * painel, antes de o cliente entrar.
   */
  async getConfigPublica(empresaId: string) {
    const empresa = await empresaRepository.findById(empresaId);
    if (!empresa || empresa.status !== "ativa") throw AppError.notFound("Empresa");

    const config = await empresaRepository.findConfig(empresaId);
    return {
      nome: empresa.nome,
      logoUrl: config?.logo_url ?? null,
      corPrimaria: config?.cor_primaria ?? null,
      corSecundaria: config?.cor_secundaria ?? null,
      corTexto: config?.cor_texto ?? null,
      corFundo: config?.cor_fundo ?? null,
    };
  },

  async updateConfig(
    empresaId: string,
    dados: {
      logoUrl?: string;
      corPrimaria?: string;
      corSecundaria?: string;
      corTexto?: string;
      corFundo?: string;
      exibirTotalGasto?: boolean;
    }
  ) {
    return empresaRepository.upsertConfig(empresaId, dados);
  },
};
