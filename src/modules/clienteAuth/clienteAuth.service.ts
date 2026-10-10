import { AppError } from "../../utils/AppError";
import { env } from "../../config/env";
import { enviarEmailRedefinicaoSenha } from "../../config/email";
import { isValidCpf, normalizeCpf } from "../../utils/cpf";
import { signClienteToken } from "../../utils/jwt";
import { comparePassword, getDummyHash, hashPassword } from "../../utils/password";
import { gerarTokenReset, hashToken } from "../../utils/resetToken";
import { clienteAuthRepository, ClienteRow } from "./clienteAuth.repository";

const RESET_TOKEN_VALIDADE_MS = 30 * 60 * 1000; // 30 minutos
/** Resposta sempre igual, exista ou não o CPF, tenha ou não e-mail — senão dá
 *  pra descobrir por aqui se um CPF está cadastrado (enumeração). */
const MENSAGEM_ESQUECI_SENHA =
  "Se encontrarmos uma conta com e-mail cadastrado para esse CPF, enviaremos um link de redefinição.";

export interface RegistrarClienteInput {
  nome: string;
  cpf: string;
  senha: string;
  telefone?: string | null;
  email?: string | null;
  /** Empresa cujo endereço originou o cadastro (ver config.ts no front) —
   *  carimbada no token pra sessão única funcionar por padaria, não global
   *  (ver signClienteToken). */
  empresaId?: string | null;
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
      return await emitir({ ...existente, senha_hash: senhaHash }, input.empresaId ?? null);
    }

    const senhaHash = await hashPassword(input.senha);
    const cliente = await clienteAuthRepository.create({
      nome: input.nome.trim(),
      cpf,
      senhaHash,
      telefone: input.telefone ? input.telefone.replace(/\D/g, "") : null,
      email: input.email?.trim() || null,
    });
    return await emitir(cliente, input.empresaId ?? null);
  },

  async login({ cpf, senha, empresaId }: { cpf: string; senha: string; empresaId?: string | null }) {
    const cliente = await clienteAuthRepository.findByCpf(normalizeCpf(cpf));
    // Sempre roda um bcrypt.compare — senão dá pra descobrir por timing se um
    // CPF tem conta, sem precisar acertar a senha.
    const ok = await comparePassword(senha, cliente?.senha_hash ?? (await getDummyHash()));
    if (!cliente || !cliente.senha_hash || !ok) {
      throw AppError.unauthorized("Credenciais inválidas.");
    }
    return await emitir(cliente, empresaId ?? null);
  },

  /** Também avança a sessão (ver `emitir`) — um token esquecido logado em
   *  outro aparelho não continua valendo depois de um logout explícito.
   *  `empresaId` vem do PRÓPRIO token (verificado), não de um input novo —
   *  só derruba a sessão da padaria que esse token já representava. */
  async sair(clienteId: string, empresaId: string | null) {
    await clienteAuthRepository.incrementarSessao(clienteId, empresaId);
  },

  async me(clienteId: string) {
    const cliente = await clienteAuthRepository.findById(clienteId);
    if (!cliente) throw AppError.notFound("Cliente");
    return publico(cliente);
  },

  async esqueciSenha(cpf: string) {
    const cliente = await clienteAuthRepository.findByCpf(normalizeCpf(cpf));
    if (cliente?.email) {
      const { token, hash } = gerarTokenReset();
      const expiraEm = new Date(Date.now() + RESET_TOKEN_VALIDADE_MS);
      await clienteAuthRepository.salvarTokenReset(cliente.id, hash, expiraEm);
      const base = env.appClienteUrl ?? "";
      const link = `${base}/app/redefinir-senha?token=${token}`;
      await enviarEmailRedefinicaoSenha(cliente.email, cliente.nome, link);
    }
    return { mensagem: MENSAGEM_ESQUECI_SENHA };
  },

  async redefinirSenha(token: string, novaSenha: string) {
    const cliente = await clienteAuthRepository.findByResetTokenHash(hashToken(token));
    if (!cliente) throw new AppError("Link inválido ou expirado. Solicite um novo.", 400);
    const senhaHash = await hashPassword(novaSenha);
    await clienteAuthRepository.redefinirSenhaComToken(cliente.id, senhaHash);
    // Já loga a pessoa na hora — evita mais um passo de digitar a senha nova
    // de novo na tela de login logo depois de acabar de criá-la. O link de
    // redefinição não carrega empresaId (é enviado por e-mail, abre fora de
    // qualquer app específico) — cai no sentinela genérico.
    return await emitir({ ...cliente, senha_hash: senhaHash }, null);
  },
};

/**
 * Emite o token de sessão e, de propósito, avança a versão PARA ESTA
 * EMPRESA antes de assinar. Programa de fidelidade é por pessoa: sem isso,
 * várias pessoas podiam dividir um CPF+senha e ficar em aparelhos
 * diferentes ao mesmo tempo, cada uma somando pontos pra mesma conta NA
 * MESMA PADARIA. Como o middleware (clienteAuth.middleware.ts) rejeita
 * qualquer token com versão desatualizada PRA AQUELA EMPRESA, logar de
 * novo nela num aparelho novo derruba a sessão anterior — mas logar em
 * OUTRA padaria (próprio app dela) não mexe nessa sessão.
 */
async function emitir(cliente: ClienteRow, empresaId: string | null) {
  const sessaoVersao = await clienteAuthRepository.incrementarSessao(cliente.id, empresaId);
  return { token: signClienteToken(cliente.id, sessaoVersao, empresaId), cliente: publico(cliente) };
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
