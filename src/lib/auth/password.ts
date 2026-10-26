import "server-only";

import { scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Hash scrypt da senha de demonstração. Nenhuma senha em texto puro é
 * armazenada ou enviada ao navegador para realizar a validação.
 *
 * Em produção, este fluxo deve ser substituído por autenticação real
 * (Supabase Auth ou equivalente), com gestão de usuários e autorização.
 */
const HASH_DE_DEMONSTRACAO =
  "scrypt$fa895c75e27690578365f5215e2025c9$df6dc71495a8f80005902c32b8114304d81b66f7fb0301eb1e3c2f19f8173c50ac512e642b784fca46f0d534e92110839c696ff2f9b3ce59af1bbe383740a6ac";

function obterHashConfigurado(): string {
  return process.env.COMPRADOR_SENHA_HASH?.trim() || HASH_DE_DEMONSTRACAO;
}

export function verificarSenhaComprador(senha: string): boolean {
  const [algoritmo, salt, hashArmazenado] = obterHashConfigurado().split("$");

  if (algoritmo !== "scrypt" || !salt || !hashArmazenado) {
    return false;
  }

  try {
    const hashInformado = scryptSync(senha, salt, 64);
    const hashEsperado = Buffer.from(hashArmazenado, "hex");

    if (hashInformado.length !== hashEsperado.length) {
      return false;
    }

    return timingSafeEqual(hashInformado, hashEsperado);
  } catch {
    return false;
  }
}
