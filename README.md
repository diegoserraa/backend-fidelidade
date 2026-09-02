# fidelidade-api

API do lado **empresa** do SaaS de fidelização de clientes (V1 / MVP — modelo padaria).
TypeScript + Express + PostgreSQL, arquitetura em camadas: `routes → controllers → services → repositories`.

## Stack

- Node.js + TypeScript
- Express
- PostgreSQL (`pg`, SQL puro — sem ORM)
- JWT (`jsonwebtoken`) para autenticação
- `bcryptjs` para hash de senha
- `zod` para validação de entrada

## Como rodar

```bash
cp .env.example .env
# edite o .env com sua string de conexão do Postgres e um JWT_SECRET forte

npm install
npm run migrate   # cria as tabelas
npm run dev        # sobe a API em modo watch (http://localhost:3000)
```

Build de produção:

```bash
npm run build
npm start
```

## Estrutura

```
src/
  config/         # env e conexão com o banco (pool + helper de transação)
  middlewares/    # auth (JWT), checagem de papel, tratamento de erro
  utils/          # AppError, asyncHandler, jwt, hash de senha
  types/          # tipos compartilhados
  modules/        # um módulo por domínio: routes, controller, service, repository
    auth/            # login do painel (usuário da empresa)
    clienteAuth/     # registro/login do cliente (PF, por CPF) — /auth/cliente/*
    portalCliente/   # rotas que o app do cliente consome — /cliente/*
    empresa/
    programaFidelidade/
    clientes/        # + POST /clientes (cadastro no balcão) e /clientes/identificar
    compras/
    recompensas/
    resgates/        # + /resgates/validar e /resgates/:id/{confirmar,recusar}
    promocoes/
    usuarios/
    dashboard/
  routes/         # agrega todas as rotas dos módulos sob /api
  app.ts          # configuração do Express
  server.ts       # entrypoint
migrations/
  001_init.sql              # schema base da V1
  002..003                  # cores do app / pontos por ciclo
  004_cliente_cpf.sql       # CPF do cliente + e-mail/senha opcionais
  005_resgate_pendente.sql  # resgate com status + validade (fluxo de balcão)
scripts/
  migrate.ts      # aplica os arquivos de migrations/ em ordem
```

## Decisões importantes

- **Multi-tenant por JWT**: toda rota autenticada usa `req.auth.empresaId` (extraído do token) para filtrar
  os dados. Nenhuma rota aceita `empresaId` vindo de query/params/body — isso evita vazamento entre empresas.
- **Papéis**: `usuario.papel` é `gestor` ou `atendente`. Rotas sensíveis (config da empresa, programa de
  fidelidade, usuários, promoções, CRUD de recompensas) exigem `gestor` via `requireRole`.
- **Transações atômicas**: `POST /compras` e `POST /resgates` fazem `SELECT ... FOR UPDATE` no saldo do
  cliente dentro de uma transação, garantindo que crédito/débito de pontos, o registro da operação e a
  entrada em `movimentacao_pontos` aconteçam de forma atômica (e sem condição de corrida entre
  operações simultâneas do mesmo cliente).
- **Idempotência**: `POST /compras` e `POST /resgates` aceitam um header `Idempotency-Key` (ou
  `idempotencyKey` no body). Reenvios com a mesma chave retornam o registro já criado em vez de gerar
  pontos duplicados — importante para PWA com conexão instável.
- **Soft delete em promoções**: em vez de `DELETE` físico, `promocao` é marcada como `inativa`,
  preservando histórico para métricas.
- **Login**: como `usuario.email` é único por empresa (não globalmente), o login recebe
  `{ cnpj, email, senha }` para identificar a empresa/tenant antes de validar a senha.
- **Sessão do cliente**: separada da sessão do painel. `/auth/cliente/*` emite um JWT com
  `scope: "cliente"` (sem `empresaId` — o cliente é PF e transita entre empresas); as rotas
  `/cliente/*` filtram por `req.clienteAuth.clienteId`.
- **Balcão por QR** (`utils/purposeToken.ts`): o app do cliente pede um token de **identidade**
  curto (~90 s) em `POST /cliente/qr` e o mostra como QR; o balcão lê e chama
  `POST /clientes/identificar` (aceita também `{ cpf }`), criando o vínculo cliente×empresa na
  hora se ainda não existir.
- **Resgate com conferência**: `POST /cliente/:empresaId/resgates` cria um `resgate` `pendente`
  (validade ~5 min, no máx. 1 pendente por cliente/empresa via índice único parcial) e devolve
  um token de resgate. O balcão faz `POST /resgates/validar` e `POST /resgates/:id/confirmar`;
  **os pontos só são debitados na confirmação**, sob `SELECT ... FOR UPDATE`. Expirou/recusou →
  nada é cobrado.

## Pendências conhecidas (fora do MVP)

- App do consumidor (PWA) já existe em `frontend-fidelizacao/src/cliente/` (rota `/app`),
  consumindo `/auth/cliente/*` e `/cliente/*`. Falta: login por código (SMS/WhatsApp) e um
  provedor de push real.
- Expiração de resgate é **preguiçosa** (marcada ao consultar/validar); um job periódico para
  varrer pendentes vencidos ficaria mais limpo.
- `GET /cliente/:empresaId/extrato` lê `movimentacao_pontos` (entradas/saídas de pontos).
- `DELETE /auth/cliente/me` exclui a conta do cliente (LGPD) — cascata apaga vínculos,
  compras, resgates e movimentações em todas as empresas.
- Envio de push real em `POST /promocoes/:id/enviar` — hoje é um stub que loga e marca como enviada;
  falta plugar um provider (FCM/OneSignal/etc).
- Recuperação de senha em `/auth`.
- Paginação já implementada em `/clientes`, `/compras` e `/resgates`; falta em `/recompensas`,
  `/promocoes` e `/usuarios` (listas tendem a ser pequenas no MVP).
