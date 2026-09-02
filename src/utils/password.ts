import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

export function comparePassword(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

let dummyHash: Promise<string> | null = null;

/**
 * Hash "de mentira" pra comparar quando a conta não existe — mantém o tempo
 * de resposta do login parecido nos dois casos (conta inexistente vs senha
 * errada), pra não dar pra descobrir por timing se um e-mail/CPF está
 * cadastrado. Gerado uma vez e reaproveitado (não é hash de conta nenhuma).
 */
export function getDummyHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(`timing-safe-dummy-${Date.now()}-${Math.random()}`);
  return dummyHash;
}
