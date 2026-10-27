import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

import { gerarSenhaInicial, normalizarComponente } from "@/lib/auth/senha-inicial";

describe("seed de senhas iniciais das filiais", () => {
  it("normaliza nome de forma determinística", () => {
    expect(normalizarComponente("Atacadão Tabuleiro")).toBe("atacadaotabuleiro");
    expect(normalizarComponente("São José")).toBe("saojose");
  });

  it("gera senha determinística a partir de nome e CNPJ", () => {
    expect(gerarSenhaInicial("Matriz", "10846217000170")).toBe("matriz0170");
    expect(gerarSenhaInicial("Matriz", "10.846.217/0001-70")).toBe("matriz0170");
    expect(gerarSenhaInicial("Atacadão Tabuleiro", "10846217000251")).toBe(
      "atacadao0251",
    );
  });

  it("nunca produz senha em texto puro persistida como hash", () => {
    const senha = gerarSenhaInicial("Matriz", "10846217000170");
    const hash = bcrypt.hashSync(senha, bcrypt.genSaltSync(10));
    expect(hash).not.toBe(senha);
    expect(hash.startsWith("$2")).toBe(true);
    expect(bcrypt.compareSync(senha, hash)).toBe(true);
  });
});
