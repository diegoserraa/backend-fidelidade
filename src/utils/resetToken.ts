import crypto from "node:crypto";

/**
 * Token de redefinição de senha: o valor "de verdade" (`token`) vai só no
 * e-mail/link, nunca é gravado no banco. Guardamos só o hash — quem tiver
 * acesso ao banco não consegue reconstruir um link válido a partir dele,
 * igual a uma senha.
 */
export function gerarTokenReset(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
