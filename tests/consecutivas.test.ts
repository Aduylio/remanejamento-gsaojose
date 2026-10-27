import { describe, expect, it } from "vitest";

import { contarConsecutivasInvalidas } from "@/lib/login/politica";

describe("contagem de tentativas inválidas consecutivas", () => {
  it("conta até o limite de três falhas consecutivas", () => {
    const tentativas = [
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: false, motivo: "senha_incorreta" },
    ];
    expect(contarConsecutivasInvalidas(tentativas)).toBe(3);
  });

  it("reinicia a contagem após um sucesso", () => {
    // Lista ordenada da mais recente para a mais antiga.
    const tentativas = [
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: true, motivo: "ok" },
      { sucesso: false, motivo: "senha_incorreta" },
    ];
    expect(contarConsecutivasInvalidas(tentativas)).toBe(2);
  });

  it("ignora tentativas recusadas durante bloqueio e sem credencial", () => {
    const tentativas = [
      { sucesso: false, motivo: "bloqueado" },
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: false, motivo: "sem_senha" },
      { sucesso: false, motivo: "senha_incorreta" },
      { sucesso: false, motivo: "senha_incorreta" },
    ];
    expect(contarConsecutivasInvalidas(tentativas)).toBe(3);
  });
});
