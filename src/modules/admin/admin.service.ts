import { AppError } from "../../utils/AppError";
import { comparePassword, getDummyHash, hashPassword } from "../../utils/password";
import { signAdminToken } from "../../utils/jwt";
import { adminRepository, EmpresaResumoRow } from "./admin.repository";

export const adminService = {
  async login(email: string, senha: string) {
    const admin = await adminRepository.findAdminByEmail(email);
    // Sempre roda um bcrypt.compare — senão dá pra descobrir por timing se um
    // e-mail tem conta de admin, sem precisar acertar a senha.
    const ok = await comparePassword(senha, admin?.senha_hash ?? (await getDummyHash()));
    if (!admin || !ok) {
      // Mensagem genérica de propósito: não revelar se o e-mail existe ou não.
      throw AppError.unauthorized("Credenciais inválidas.");
    }
    return {
      token: signAdminToken(admin.id),
      admin: { id: admin.id, nome: admin.nome, email: admin.email },
    };
  },

  async me(adminId: string) {
    const admin = await adminRepository.findAdminById(adminId);
    if (!admin) throw AppError.notFound("Administrador");
    return admin;
  },

  async listEmpresas() {
    const rows = await adminRepository.listEmpresas();
    return rows.map(mapEmpresa);
  },

  async createEmpresa(dados: {
    nome: string;
    cnpj: string;
    email?: string;
    telefone?: string;
    gestor: { nome: string; email: string; senha: string };
  }) {
    const senhaHash = await hashPassword(dados.gestor.senha);
    try {
      const { empresaId } = await adminRepository.createEmpresaComGestor(
        { nome: dados.nome, cnpj: dados.cnpj, email: dados.email, telefone: dados.telefone },
        { nome: dados.gestor.nome, email: dados.gestor.email, senhaHash }
      );
      return { empresaId };
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw AppError.conflict("Já existe uma empresa cadastrada com esse CNPJ.");
      }
      throw err;
    }
  },

  async updateEmpresaStatus(id: string, status: "ativa" | "inativa") {
    const empresa = await adminRepository.updateEmpresaStatus(id, status);
    if (!empresa) throw AppError.notFound("Empresa");
    return mapEmpresa(empresa);
  },
};

function mapEmpresa(row: EmpresaResumoRow) {
  return {
    id: row.id,
    nome: row.nome,
    cnpj: row.cnpj,
    email: row.email,
    telefone: row.telefone,
    status: row.status,
    createdAt: row.created_at,
    usuarios: Number(row.usuarios),
    clientes: Number(row.clientes),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
