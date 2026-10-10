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
  /** Empresa cujo endereço (subdomínio, ver manifest.service.ts) originou o
   *  login — cada padaria é um app/origem própria agora, então a sessão é
   *  rastreada por (cliente, empresa), não só por cliente. `null` quando não
   *  dá pra identificar a empresa na hora do login (ex.: acesso direto pelo
   *  domínio base, sem subdomínio nem ?empresa=). */
  empresaId: string | null;
  /** Versão da sessão PARA ESTA EMPRESA no momento em que o token foi
   *  emitido — comparada com `cliente_sessao` a cada request
   *  (clienteAuth.middleware) para impor sessão única por padaria: logar
   *  nessa MESMA padaria num aparelho novo invalida o anterior, mas logar
   *  em OUTRA padaria (próprio app dela) não mexe nessa. */
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
