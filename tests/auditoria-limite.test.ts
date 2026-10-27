import { describe, expect, it } from "vitest";

import {
  podeGerenciarCredenciais,
  podeVisualizarAuditoria,
  precisaConfigurarSenha,
} from "@/lib/auth/permissoes";

describe("autorização e limites de auditoria", () => {
  it("limita a consulta a no máximo 100 registros", () => {
    const limitar = (valor: number) => Math.min(Math.max(valor, 1), 100);
    expect(limitar(100)).toBe(100);
    expect(limitar(150)).toBe(100);
    expect(limitar(0)).toBe(1);
  });

  it("restringe a auditoria a perfis autorizados", () => {
    expect(podeVisualizarAuditoria({ comprador: true })).toBe(true);
    expect(podeVisualizarAuditoria({ comprador: false, filialId: "loja-01" })).toBe(
      false,
    );
    expect(podeGerenciarCredenciais({ comprador: true })).toBe(true);
    expect(podeGerenciarCredenciais({ comprador: false })).toBe(false);
  });

  it("não substitui credencial já configurada no seed", () => {
    expect(precisaConfigurarSenha(null)).toBe(true);
    expect(precisaConfigurarSenha("   ")).toBe(true);
    expect(precisaConfigurarSenha("$2b$10$hash-existente")).toBe(false);
  });
});
