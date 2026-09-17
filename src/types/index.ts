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
  /** Versão da sessão no momento em que o token foi emitido — comparada com
   *  `cliente.sessao_versao` a cada request (clienteAuth.middleware) para
   *  impor sessão única: logar num aparelho novo invalida os anteriores. */
  sv: number;
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
