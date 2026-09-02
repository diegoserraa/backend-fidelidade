import { AppError } from "../../utils/AppError";
import { hashPassword } from "../../utils/password";
import { permissoesRepository } from "../permissoes/permissoes.repository";
import { Recurso, RECURSOS } from "../permissoes/permissoes.types";
import { usuariosRepository } from "./usuarios.repository";

export const usuariosService = {
  async list(empresaId: string) {
    const rows = await usuariosRepository.list(empresaId);
    return Promise.all(rows.map(mapUsuarioComPermissoes));
  },

  async getById(empresaId: string, id: string) {
    const usuario = await usuariosRepository.findById(empresaId, id);
    if (!usuario) throw AppError.notFound("Usuário");
    return mapUsuarioComPermissoes(usuario);
  },

  async create(
    empresaId: string,
    dados: {
      nome: string;
      email: string;
      senha: string;
      papel: "gestor" | "atendente";
      permissoes?: Recurso[];
    }
  ) {
    const senhaHash = await hashPassword(dados.senha);
    const usuario = await usuariosRepository.create(empresaId, {
      nome: dados.nome,
      email: dados.email,
      senhaHash,
      papel: dados.papel,
    });
    // Privilégio mínimo por padrão: só grava permissões para atendente, e só
    // as que vierem explicitamente marcadas (sem lista => sem acesso algum).
    if (dados.papel === "atendente" && dados.permissoes?.length) {
      await permissoesRepository.setForUsuario(usuario.id, dados.permissoes);
    }
    return mapUsuarioComPermissoes(usuario);
  },

  async update(empresaId: string, id: string, dados: { nome?: string; email?: string; papel?: "gestor" | "atendente" }) {
    const usuario = await usuariosRepository.update(empresaId, id, dados);
    if (!usuario) throw AppError.notFound("Usuário");
    // Gestor tem acesso total implícito — não faz sentido guardar permissões
    // para ele, então limpa qualquer resquício de quando era atendente.
    if (usuario.papel === "gestor") {
      await permissoesRepository.clearForUsuario(usuario.id);
    }
    return mapUsuarioComPermissoes(usuario);
  },

  async setPermissoes(empresaId: string, id: string, permissoes: Recurso[]) {
    const usuario = await usuariosRepository.findById(empresaId, id);
    if (!usuario) throw AppError.notFound("Usuário");
    if (usuario.papel === "gestor") {
      throw AppError.conflict("Gestor já tem acesso total — não é necessário configurar permissões.");
    }
    await permissoesRepository.setForUsuario(id, permissoes);
    return mapUsuarioComPermissoes(usuario);
  },

  async updateStatus(empresaId: string, id: string, status: "ativo" | "inativo") {
    const usuario = await usuariosRepository.updateStatus(empresaId, id, status);
    if (!usuario) throw AppError.notFound("Usuário");
    return mapUsuarioComPermissoes(usuario);
  },

  async remove(empresaId: string, id: string, solicitanteId: string) {
    if (id === solicitanteId) {
      throw new AppError("Você não pode excluir o próprio usuário.", 409);
    }
    try {
      const ok = await usuariosRepository.remove(empresaId, id);
      if (!ok) throw AppError.notFound("Usuário");
    } catch (err) {
      if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23503") {
        throw new AppError(
          "Esse usuário tem compras ou resgates registrados. Inative o acesso em vez de excluir.",
          409
        );
      }
      throw err;
    }
  },
};

async function mapUsuarioComPermissoes(row: {
  id: string;
  nome: string;
  email: string;
  papel: string;
  status: string;
  created_at: Date;
}) {
  // Gestor tem acesso total implícito — devolve o catálogo inteiro em vez de
  // consultar a tabela, então quem consome (frontend/`/auth/me`) faz uma
  // única checagem uniforme (`permissoes.includes(recurso)`) sem tratar o
  // papel como caso especial.
  const permissoes = row.papel === "gestor" ? [...RECURSOS] : await permissoesRepository.listByUsuario(row.id);
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    papel: row.papel,
    status: row.status,
    createdAt: row.created_at,
    permissoes,
  };
}
