-- =====================================================================
-- SEED de dados para os testes .http
-- =====================================================================
-- A API não expõe rota de cadastro público de empresa/gestor. Para
-- exercitar as rotas autenticadas do painel é preciso ter pelo menos:
--   1) uma empresa
--   2) um usuário "gestor" dessa empresa (única forma de logar no painel)
--   3) um cliente já vinculado à empresa (cliente_empresa) com saldo
--      de pontos suficiente para testar resgates
--
-- O cliente PORTAL (55.. abaixo) já tem CPF + senha e serve para testar
-- /auth/cliente/login e o fluxo de resgate pendente ponta a ponta.
--
-- Rode isto UMA VEZ contra o banco apontado em DATABASE_URL, depois de
-- `npm run migrate`:
--
--   psql "$DATABASE_URL" -f fidelidade-api/src/testes/00-seed.sql
--
-- Credenciais do painel (batem com http-client.env.json):
--   cnpj:  12345678000199
--   email: gestor@padariateste.com
--   senha: 123456   (hash bcrypt abaixo já corresponde a "123456")
--
-- Credenciais do portal do cliente:
--   cpf:   52998224725
--   senha: 123456
-- =====================================================================

BEGIN;

INSERT INTO empresa (id, nome, cnpj, email, telefone, status)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Padaria Teste LTDA',
  '12345678000199',
  'contato@padariateste.com',
  '11999990000',
  'ativa'
)
ON CONFLICT (cnpj) DO NOTHING;

-- senha_hash = bcrypt("123456", 10 rounds)
INSERT INTO usuario (id, empresa_id, nome, email, senha_hash, papel, status)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Gestor Teste',
  'gestor@padariateste.com',
  '$2a$10$phicuQ88Nezq87GYaN1MHO8aTqw9A6biDW8S/LBg3hUM9WBhdOJ/S',
  'gestor',
  'ativo'
)
ON CONFLICT (empresa_id, email) DO NOTHING;

-- cliente "legado" do seed original — agora com CPF válido
INSERT INTO cliente (id, nome, email, telefone, senha_hash, cpf)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'Cliente Teste',
  'cliente.teste@example.com',
  '11988887777',
  '$2a$10$phicuQ88Nezq87GYaN1MHO8aTqw9A6biDW8S/LBg3hUM9WBhdOJ/S',
  '11144477735'
)
ON CONFLICT (id) DO UPDATE SET cpf = EXCLUDED.cpf;

INSERT INTO cliente_empresa (id, cliente_id, empresa_id, saldo_pontos, status)
VALUES (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  500,
  'ativo'
)
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

-- cliente PORTAL: CPF + senha ("123456") para /auth/cliente/login
INSERT INTO cliente (id, nome, telefone, senha_hash, cpf)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  'Cliente Portal',
  '11977776666',
  '$2a$10$phicuQ88Nezq87GYaN1MHO8aTqw9A6biDW8S/LBg3hUM9WBhdOJ/S',
  '52998224725'
)
ON CONFLICT (id) DO UPDATE SET cpf = EXCLUDED.cpf, senha_hash = EXCLUDED.senha_hash;

INSERT INTO cliente_empresa (id, cliente_id, empresa_id, saldo_pontos, status)
VALUES (
  '66666666-6666-6666-6666-666666666666',
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  300,
  'ativo'
)
ON CONFLICT (cliente_id, empresa_id) DO NOTHING;

-- uma recompensa barata para exercitar o resgate pendente
INSERT INTO recompensa (id, empresa_id, titulo, descricao, custo_pontos, status)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  'Café grátis',
  'Um café expresso por conta da casa',
  100,
  'ativa'
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
