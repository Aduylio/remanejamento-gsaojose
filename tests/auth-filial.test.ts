import { describe, expect, it } from "vitest";

import { hashSenha, verificarSenha } from "@/lib/auth/filial-senha";

describe("autenticação por filial com bcrypt", () => {
  it("gera hash bcrypt e verifica senha corretamente", () => {
    const senha = "filial123456";
    const hash = hashSenha(senha);
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toBe(senha);
    expect(verificarSenha(senha, hash)).toBe(true);
    expect(verificarSenha("outra", hash)).toBe(false);
    expect(verificarSenha("", hash)).toBe(false);
  });

  it("usa salt diferente a cada hash", () => {
    const a = hashSenha("mesma-senha");
    const b = hashSenha("mesma-senha");
    expect(a).not.toBe(b);
    expect(verificarSenha("mesma-senha", a)).toBe(true);
    expect(verificarSenha("mesma-senha", b)).toBe(true);
  });
});
