# Testes HTTP — fidelidade-api

Coleção de arquivos `.http` (formato do VS Code REST Client — também
funciona no HTTP Client do JetBrains) cobrindo **todas as rotas** da
API, incluindo casos de sucesso, validação (422), autenticação (401),
autorização por papel (403) e não encontrado (404).

## Pré-requisitos

1. Extensão **REST Client** (Huachao Mao) instalada no VS Code.
2. API rodando localmente:
   ```bash
   cd fidelidade-api
   cp .env.example .env
   npm install
   npm run migrate
   npm run dev   # http://localhost:3000
   ```
3. **Seed inicial** — a API não tem cadastro público de empresa/gestor
   nem de cliente, então rode o script uma vez contra o seu banco:
   ```bash
   psql "$DATABASE_URL" -f fidelidade-api/00-seed.sql
   ```
   Isso cria:
   - empresa `Padaria Teste LTDA` (CNPJ `12345678000199`)
   - usuário gestor `gestor@padariateste.com` / senha `123456`
   - um cliente já vinculado à empresa, com 500 pontos de saldo

## Como rodar

No VS Code, selecione o ambiente **`dev`** (canto inferior direito,
"No Environment" → `dev`) — ele vem definido em
`http-client.env.json` com `baseUrl`, `cnpj`, `email`, `senha` e
`clienteId`.

Abra qualquer arquivo `.http` e clique em **Send Request** acima de
cada bloco (separado por `###`). Cada arquivo já faz seu próprio
login no topo e guarda o token em `@token` — não precisa copiar nada
manualmente.

## Ordem sugerida

| Arquivo | Cobre |
|---|---|
| `00-health.http` | `/health` e 404 genérico |
| `01-auth.http` | login, `/auth/me` |
| `02-empresa.http` | dados e config da empresa |
| `03-programa-fidelidade.http` | regra de pontuação |
| `04-usuarios.http` | CRUD de usuários (só gestor) |
| `05-clientes.http` | listagem, status, resumo |
| `06-compras.http` | registrar compra + idempotência |
| `07-recompensas.http` | CRUD de recompensas |
| `08-resgates.http` | registrar resgate + idempotência + saldo insuficiente |
| `09-promocoes.http` | CRUD + soft delete + enviar |
| `10-dashboard.http` | indicadores gerais |
| `11-cliente-portal.http` | login do cliente, QR de identidade, catálogo, solicitar/cancelar resgate pendente |
| `12-balcao.http` | identificar por QR/CPF, cadastro no balcão, compra idempotente, validar + confirmar baixa do resgate |

Os arquivos são independentes entre si (cada um refaz login e cria
os recursos de que precisa), então dá pra rodar fora de ordem — a
única dependência real é o seed do banco (passo 3 acima). Exceção:
`12-balcao.http` precisa de um token de identidade e de um resgate
pendente gerados no `11-cliente-portal.http` (cole os valores nos `@`
do topo do arquivo — o REST Client não compartilha variáveis entre
arquivos).

## O que cada arquivo valida

Além do "caminho feliz" (200/201), cada rota tem pelo menos um caso
negativo ao lado:

- **401** — request sem `Authorization` ou com token inválido
- **403** — implícito nas rotas `requireRole("gestor")`: troque o
  login por um usuário `atendente` (crie um em `04-usuarios.http`) e
  repita as chamadas de `usuarios`, `promocoes`, `empresa` (PUT) etc.
  para ver o 403 na prática
- **404** — id inexistente (UUID válido, mas sem registro)
- **422** — payload que viola o schema `zod` do controller
- **409** — violação de unicidade (email de usuário duplicado)
- **idempotência** — mesma `Idempotency-Key` em `POST /compras` e
  `POST /resgates` retorna o registro já existente em vez de duplicar
