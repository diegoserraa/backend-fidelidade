export type Papel = "gestor" | "atendente";

export interface JwtPayload {
  usuarioId: string;
  empresaId: string;
  papel: Papel;
  /** Separa este token do de cliente (mesmo segredo) — um nunca passa pelo
   *  middleware do outro, mesmo tendo assinatura válida. */
  scope: "usuario";
}

export interface ClienteJwtPayload {
  clienteId: string;
  scope: "cliente";
}

/** Dono da plataforma — não pertence a nenhuma empresa (ver migration 007). */
export interface AdminJwtPayload {
  adminId: string;
  scope: "admin";
}

export interface Paginacao {
  page: number;
  pageSize: number;
}

export interface RespostaPaginada<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
