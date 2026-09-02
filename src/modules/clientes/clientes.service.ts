import { AppError } from "../../utils/AppError";
import { Paginacao } from "../../types";
import { isValidCpf, maskCpf, normalizeCpf } from "../../utils/cpf";
import { verifyIdentityToken } from "../../utils/purposeToken";
import { clientesRepository } from "./clientes.repository";

export const clientesService = {
  async list(empresaId: string, paginacao: Paginacao) {
    const { rows, total } = await clientesRepository.listByEmpresa(empresaId, paginacao);
    return {
      data: rows.map(mapCliente),
      page: paginacao.page,
      pageSize: paginacao.pageSize,
      total,
    };
  },

  async getById(empresaId: string, clienteEmpresaId: string) {
    const cliente = await clientesRepository.findByIdInEmpresa(empresaId, clienteEmpresaId);
    if (!cliente) throw AppError.notFound("Cliente");
    return mapCliente(cliente);
  },

  async updateStatus(empresaId: string, clienteEmpresaId: string, status: "ativo" | "inativo") {
    const atualizado = await clientesRepository.updateStatus(empresaId, clienteEmpresaId, status);
    if (!atualizado) throw AppError.notFound("Cliente");
    return this.getById(empresaId, clienteEmpresaId);
  },

  /** Edita os dados do cliente (nome / telefone / CPF). O `id` é de cliente_empresa. */
  async atualizar(
    empresaId: string,
    clienteEmpresaId: string,
    dados: { nome?: string; telefone?: string | null; cpf?: string }
  ) {
    const atual = await clientesRepository.findByIdInEmpresa(empresaId, clienteEmpresaId);
    if (!atual) throw AppError.notFound("Cliente");

    let cpf: string | undefined;
    if (dados.cpf !== undefined) {
      cpf = normalizeCpf(dados.cpf);
      if (!isValidCpf(cpf)) throw new AppError("CPF inválido.", 422);
      const dono = await clientesRepository.findClienteByCpf(cpf);
      if (dono && dono.id !== atual.cliente_id) {
        throw new AppError("Já existe outro cliente com esse CPF.", 409);
      }
    }

    await clientesRepository.updateClienteDados(atual.cliente_id, {
      nome: dados.nome?.trim(),
      telefone:
        dados.telefone === undefined
          ? undefined
          : dados.telefone
            ? dados.telefone.replace(/\D/g, "")
            : null,
      cpf,
    });
    return this.getById(empresaId, clienteEmpresaId);
  },

  /** Remove o cliente da base desta empresa (apaga o vínculo e o histórico local). */
  async remover(empresaId: string, clienteEmpresaId: string) {
    const ok = await clientesRepository.deleteVinculo(empresaId, clienteEmpresaId);
    if (!ok) throw AppError.notFound("Cliente");
  },

  async resumo(empresaId: string, clienteEmpresaId: string) {
    await this.getById(empresaId, clienteEmpresaId); // valida existência/tenant
    const resumo = await clientesRepository.resumo(empresaId, clienteEmpresaId);
    return resumo;
  },

  /**
   * Cadastro pelo balcão: cria o cliente (PF, por CPF) se ainda não existir e
   * garante o vínculo ativo com a empresa. Reaproveita um cliente que já tenha
   * conta no app (mesmo CPF) sem duplicar.
   */
  async enrollBalcao(
    empresaId: string,
    dados: { nome: string; cpf: string; telefone?: string | null }
  ) {
    const cpf = normalizeCpf(dados.cpf);
    if (!isValidCpf(cpf)) throw new AppError("CPF inválido.", 422);

    let base = await clientesRepository.findClienteByCpf(cpf);
    if (!base) {
      base = await clientesRepository.createClienteMinimo({
        nome: dados.nome.trim(),
        cpf,
        telefone: dados.telefone ? dados.telefone.replace(/\D/g, "") : null,
      });
    }

    const clienteEmpresaId = await clientesRepository.criarOuReativarVinculo(empresaId, base.id, true);
    return this.getById(empresaId, clienteEmpresaId);
  },

  /**
   * Identifica o cliente no balcão a partir do QR (token de identidade) ou do
   * CPF digitado. Se ainda não houver vínculo com esta empresa, cria um na hora
   * (auto-vínculo) e sinaliza `novoVinculo`.
   */
  async identificar(empresaId: string, entrada: { token?: string; cpf?: string }) {
    let clienteId: string;

    if (entrada.token) {
      try {
        clienteId = verifyIdentityToken(entrada.token).clienteId;
      } catch {
        throw new AppError("QR inválido ou expirado. Peça para o cliente gerar outro.", 422);
      }
    } else if (entrada.cpf) {
      const cpf = normalizeCpf(entrada.cpf);
      if (!isValidCpf(cpf)) throw new AppError("CPF inválido.", 422);
      const base = await clientesRepository.findClienteByCpf(cpf);
      if (!base) throw new AppError("Nenhum cliente com esse CPF. Cadastre no balcão.", 404);
      clienteId = base.id;
    } else {
      throw new AppError("Informe o QR ou o CPF do cliente.", 422);
    }

    const vinculo = await clientesRepository.findVinculo(empresaId, clienteId);
    const novoVinculo = !vinculo;
    const clienteEmpresaId =
      vinculo?.id ?? (await clientesRepository.criarOuReativarVinculo(empresaId, clienteId, false));

    const cliente = await this.getById(empresaId, clienteEmpresaId);
    return {
      clienteEmpresaId: cliente.id,
      clienteId: cliente.clienteId,
      nome: cliente.nome,
      cpfMascarado: cliente.cpf ? maskCpf(cliente.cpf) : null,
      telefone: cliente.telefone,
      saldoPontos: cliente.saldoPontos,
      status: cliente.status,
      novoVinculo,
    };
  },
};

function mapCliente(row: Awaited<ReturnType<typeof clientesRepository.findByIdInEmpresa>> & object) {
  return {
    id: row.cliente_empresa_id,
    clienteId: row.cliente_id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    cpf: row.cpf,
    saldoPontos: row.saldo_pontos,
    status: row.status,
    desde: row.created_at,
  };
}
