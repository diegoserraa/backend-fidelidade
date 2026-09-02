import { AppError } from "../../utils/AppError";
import { comparePassword, getDummyHash } from "../../utils/password";
import { signToken } from "../../utils/jwt";
import { permissoesRepository } from "../permissoes/permissoes.repository";
import { Recurso, RECURSOS } from "../permissoes/permissoes.types";
import { authRepository } from "./auth.repository";

/**
 * Gestor tem acesso total implícito (não passa pela tabela de permissões).
 * Devolver o catálogo inteiro pra ele deixa o consumidor (frontend) com uma
 * única checagem uniforme — `permissoes.includes(recurso)` — em vez de
 * precisar tratar o papel como caso especial em todo lugar.
 */
async function permissoesDoUsuario(usuarioId: string, papel: string): Promise<Recurso[]> {
  return papel === "gestor" ? [...RECURSOS] : permissoesRepository.listByUsuario(usuarioId);
}

export interface LoginInput {
  cnpj: string;
  email: string;
  senha: string;
}

export const authService = {
  async login({ cnpj, email, senha }: LoginInput) {
    const usuario = await authRepository.findByCnpjAndEmail(cnpj, email);

    // Sempre roda um bcrypt.compare, exista ou não a conta — senão dá pra
    // descobrir por timing (resposta mais rápida) que um cnpj/e-mail não tem
    // cadastro, sem precisar acertar a senha.
    const senhaOk = await comparePassword(senha, usuario?.senha_hash ?? (await getDummyHash()));

    if (!usuario || usuario.status !== "ativo" || !senhaOk) {
      // Mensagem genérica de propósito: não revelar se o e-mail existe ou não.
      throw AppError.unauthorized("Credenciais inválidas.");
    }

    // Diferente da checagem acima: aqui a pessoa já provou quem é, então dá
    // pra ser específico — não é a senha, é a empresa que foi desativada.
    if (usuario.empresa_status !== "ativa") {
      throw AppError.forbidden("Esta empresa está inativa. Fale com o suporte.");
    }

    const token = signToken({
      usuarioId: usuario.id,
      empresaId: usuario.empresa_id,
      papel: usuario.papel,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papel: usuario.papel,
        permissoes: await permissoesDoUsuario(usuario.id, usuario.papel),
      },
    };
  },

  async me(usuarioId: string) {
    const usuario = await authRepository.findById(usuarioId);
    if (!usuario) {
      throw AppError.notFound("Usuário");
    }
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      empresaId: usuario.empresa_id,
      permissoes: await permissoesDoUsuario(usuario.id, usuario.papel),
    };
  },
};
