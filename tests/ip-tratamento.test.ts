import { afterEach, describe, expect, it } from "vitest";

import { ehIpValido, ipPertenceA, obterIpObservado } from "@/lib/ip";

const original = process.env.TRUSTED_PROXIES;

afterEach(() => {
  process.env.TRUSTED_PROXIES = original;
});

describe("tratamento de IP e proxy", () => {
  it("valida IPs IPv4 e IPv6 básicos", () => {
    expect(ehIpValido("192.168.1.1")).toBe(true);
    expect(ehIpValido("256.0.0.1")).toBe(false);
    expect(ehIpValido("abc")).toBe(false);
    expect(ehIpValido("::1")).toBe(true);
  });

  it("reconhece faixas CIDR de proxies confiáveis", () => {
    expect(ipPertenceA("10.0.0.5", "10.0.0.0/8")).toBe(true);
    expect(ipPertenceA("11.0.0.5", "10.0.0.0/8")).toBe(false);
    expect(ipPertenceA("192.168.1.10", "192.168.1.10")).toBe(true);
  });

  it("ignora cabeçalhos de proxy quando não há proxy confiável configurado", () => {
    process.env.TRUSTED_PROXIES = "";
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.50",
      "x-real-ip": "203.0.113.50",
    });
    expect(obterIpObservado(headers)).toEqual({});
  });

  it("usa o primeiro IP não confiável da direita para a esquerda", () => {
    process.env.TRUSTED_PROXIES = "10.0.0.0/8,192.168.0.0/16";
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.7, 10.0.0.2, 192.168.1.1",
    });
    expect(obterIpObservado(headers)).toEqual({
      ip: "198.51.100.7",
      fonte: "x-forwarded-for",
    });
  });

  it("descarta IP inválido e não inventa localização", () => {
    process.env.TRUSTED_PROXIES = "10.0.0.1";
    const headers = new Headers({ "x-forwarded-for": "not-an-ip" });
    expect(obterIpObservado(headers)).toEqual({});
  });
});
