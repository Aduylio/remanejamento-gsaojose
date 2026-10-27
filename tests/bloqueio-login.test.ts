import { describe, expect, it } from "vitest";

import {
  BLOQUEIO_MINUTOS,
  LIMITE_TENTATIVAS,
  calcularBloqueadoAte,
  calcularInicioJanela,
  chaveGlobal,
  chaveOrigem,
} from "@/lib/login/politica";

describe("política de bloqueio por origem", () => {
  it("considera filial e IP para compor a chave de bloqueio", () => {
    expect(chaveOrigem({ filialId: "loja-01", ip: "10.0.0.1" })).toBe(
      "loja-01|10.0.0.1",
    );
    expect(chaveOrigem({ filialId: null, ip: "10.0.0.2" })).toBe(
      "global|10.0.0.2",
    );
    expect(chaveGlobal("10.0.0.2")).toBe("global|10.0.0.2");
  });

  it("bloqueia na terceira tentativa inválida consecutiva", () => {
    expect(LIMITE_TENTATIVAS).toBe(3);
  });

  it("mantém o bloqueio persistente por dois minutos", () => {
    const agora = new Date("2026-01-01T10:00:00.000Z");
    expect(BLOQUEIO_MINUTOS).toBe(2);
    expect(calcularBloqueadoAte(agora).toISOString()).toBe(
      "2026-01-01T10:02:00.000Z",
    );
    expect(calcularInicioJanela(agora).toISOString()).toBe(
      "2026-01-01T09:58:00.000Z",
    );
  });

  it("expira por comparação com o horário do servidor, sem timers", () => {
    const agora = new Date("2026-01-01T10:00:00.000Z");
    const ate = calcularBloqueadoAte(agora);
    expect(ate > agora).toBe(true);
    expect(new Date("2026-01-01T10:02:01.000Z") > ate).toBe(true);
  });
});
