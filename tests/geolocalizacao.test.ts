import { describe, expect, it } from "vitest";

import { validarLocalizacaoCliente } from "@/lib/geolocalizacao";

describe("validação de geolocalização informada pelo cliente", () => {
  it("aceita coordenadas válidas e marca a origem", () => {
    const geo = validarLocalizacaoCliente({
      latitude: "-3.731862",
      longitude: "-38.526670",
      precisao: "25",
    });
    expect(geo).not.toBeNull();
    expect(geo!.origem).toBe("informada_pelo_cliente");
    expect(geo!.latitude).toBe(-3.731862);
    expect(geo!.precisaoMetros).toBe(25);
  });

  it("rejeita dados ausentes, inválidos ou fora dos limites", () => {
    expect(validarLocalizacaoCliente({})).toBeNull();
    expect(
      validarLocalizacaoCliente({ latitude: "abc", longitude: "1" }),
    ).toBeNull();
    expect(
      validarLocalizacaoCliente({ latitude: "91", longitude: "0" }),
    ).toBeNull();
    expect(
      validarLocalizacaoCliente({ latitude: "0", longitude: "181" }),
    ).toBeNull();
    expect(
      validarLocalizacaoCliente({ latitude: "", longitude: "" }),
    ).toBeNull();
  });
});
