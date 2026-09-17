import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyClienteToken } from "../utils/jwt";
import { clienteAuthRepository } from "../modules/clienteAuth/clienteAuth.repository";

/**
 * Espelho do authMiddleware para a sessão do cliente (app / portal). Popula
 * req.clienteAuth com { clienteId }. As rotas de /cliente devem filtrar SEMPRE
 * por req.clienteAuth.clienteId — nunca por um id vindo de query/params/body.
 *
 * Também impõe sessão única: compara a versão gravada no token (`sv`) com
 * `cliente.sessao_versao` atual a cada request. Login/logout avançam essa
 * versão (clienteAuth.service.ts), então um token de um aparelho anterior
 * passa a ser rejeitado assim que a pessoa loga em outro — programa de
 * fidelidade é por pessoa, não dá pra deixar dividir CPF+senha entre vários
 * aparelhos somando pontos ao mesmo tempo.
 */
export function clienteAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    throw AppError.unauthorized("Token de autenticação ausente.");
  }

  let payload;
  try {
    payload = verifyClienteToken(header.slice("Bearer ".length));
  } catch {
    throw AppError.unauthorized("Token inválido ou expirado.");
  }
  req.clienteAuth = payload;

  clienteAuthRepository
    .sessaoVersaoAtual(payload.clienteId)
    .then((versaoAtual) => {
      if (versaoAtual === null || versaoAtual !== payload.sv) {
        // `detalhes.motivo` deixa o frontend mostrar essa mensagem específica
        // (em vez do "sessão expirou" genérico) sem depender de comparar texto.
        next(
          new AppError("Sua sessão foi encerrada porque sua conta foi acessada em outro aparelho.", 401, {
            motivo: "outro_aparelho",
          })
        );
        return;
      }
      next();
    })
    .catch(next);
}
