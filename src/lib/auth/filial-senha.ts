import "server-only";

import bcrypt from "bcryptjs";

const ROUNDS = 10;

export function gerarSalt(): string {
  return bcrypt.genSaltSync(ROUNDS);
}

export function hashSenha(senha: string): string {
  const salt = gerarSalt();
  return bcrypt.hashSync(senha, salt);
}

export function verificarSenha(senha: string, hash: string): boolean {
  try {
    return bcrypt.compareSync(senha, hash);
  } catch {
    return false;
  }
}
