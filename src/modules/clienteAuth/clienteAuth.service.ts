import { AppError } from "../../utils/AppError";
import { isValidCpf, normalizeCpf } from "../../utils/cpf";
import { signClienteToken } from "../../utils/jwt";
import { comparePassword, getDummyHash, hashPassword } from "../../utils/password";
import { clienteAuthRepository, ClienteRow } from "./clienteAuth.repository";

export interface RegistrarClienteInput {
  nome: string;
  cpf: string;
  senha: string;
  telefone?: string | null;
  email?: string | null;
}

export const clienteAuthService = {
  async registrar(input: RegistrarClienteInput) {
    const cpf = normalizeCpf(input.cpf);
    if (!isValidCpf(cpf)) throw new AppError("CPF inválido.", 422);

    const existente = await clienteAuthRepository.findByCpf(cpf);

    // Cliente já cadastrado no balcão (sem senha) pode "assumir" a conta agora.
    if (existente) {
      if (existente.senha_hash) {
        throw new AppError("Já existe uma conta com esse CPF. Faça login.", 409);
      }
      const senhaHash = await hashPassword(input.senha);
      await clienteAuthRepository.setSenha(existente.id, senhaHash);
      return emitir({ ...existente, senha_hash: senhaHash });
    }

    const senhaHash = await hashPassword(input.senha);
    const cliente = await clienteAuthRepository.create({
      nome: input.nome.trim(),
      cpf,
      senhaHash,
      telefone: input.telefone ? input.telefone.replace(/\D/g, "") : null,
      email: input.email?.trim() || null,
    });
    return emitir(cliente);
  },

  async login({ cpf, senha }: { cpf: string; senha: string }) {
    const cliente = await clienteAuthRepository.findByCpf(normalizeCpf(cpf));
    // Sempre roda um bcrypt.compare — senão dá pra descobrir por timing se um
    // CPF tem conta, sem precisar acertar a senha.
    const ok = await comparePassword(senha, cliente?.senha_hash ?? (await getDummyHash()));
    if (!cliente || !cliente.senha_hash || !ok) {
      throw AppError.unauthorized("Credenciais inválidas.");
    }
    return emitir(cliente);
  },

  async me(clienteId: string) {
    const cliente = await clienteAuthRepository.findById(clienteId);
    if (!cliente) throw AppError.notFound("Cliente");
    return publico(cliente);
  },

  async excluirConta(clienteId: string) {
    const ok = await clienteAuthRepository.deleteById(clienteId);
    if (!ok) throw AppError.notFound("Cliente");
  },
};

function emitir(cliente: ClienteRow) {
  return { token: signClienteToken(cliente.id), cliente: publico(cliente) };
}

function publico(cliente: ClienteRow) {
  return {
    id: cliente.id,
    nome: cliente.nome,
    cpf: cliente.cpf,
    email: cliente.email,
    telefone: cliente.telefone,
  };
}
