import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * Testes de integração opcionais. Só executam quando TEST_DATABASE_URL é
 * definida e apontam para um schema temporário isolado, removido ao final.
 * Nunca usam nem limpam os dados de produção (schema "public").
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL?.trim();
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const SCHEMA = `test_remanejamento_${Date.now()}_${Math.floor(
  Math.random() * 1e6,
)}`;

function urlComSchema(base: string, schema: string): string {
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  return url.toString();
}

const TEST_URL = TEST_DATABASE_URL
  ? urlComSchema(TEST_DATABASE_URL, SCHEMA)
  : undefined;

let prisma: PrismaClient;
let controle: typeof import("@/lib/login/controle-acesso");
let auditoria: typeof import("@/lib/auditoria");
let consulta: typeof import("@/lib/db/auditoria");
let disponivel = false;

describe.skipIf(!TEST_URL)("integração de login, bloqueio e auditoria", () => {
  beforeAll(async () => {
    if (!TEST_URL) return;

    process.env.DATABASE_URL = TEST_URL;

    const migracao = spawnSync(
      "npx",
      ["prisma", "migrate", "deploy"],
      {
        cwd: RAIZ,
        env: { ...process.env, DATABASE_URL: TEST_URL },
        encoding: "utf8",
      },
    );

    if (migracao.status !== 0) {
      throw new Error(
        `Falha ao preparar schema de teste: ${migracao.stderr || migracao.stdout}`,
      );
    }

    prisma = new PrismaClient({ datasourceUrl: TEST_URL });
    controle = await import("@/lib/login/controle-acesso");
    auditoria = await import("@/lib/auditoria");
    consulta = await import("@/lib/db/auditoria");

    const senhaHash = bcrypt.hashSync("senha-filial-teste", 10);
    await prisma.filial.create({
      data: {
        id: "loja-01",
        numero: 1,
        nome: "Matriz Teste",
        cnpj: "10846217000170",
        senhaHash,
      },
    });

    disponivel = true;
  }, 120_000);

  afterAll(async () => {
    if (!TEST_URL) return;
    try {
      const dropar = new PrismaClient({ datasourceUrl: TEST_URL });
      await dropar.$executeRawUnsafe(
        `DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`,
      );
      await dropar.$disconnect();
    } catch {
      // schema de teste isolado; falha de limpeza não afeta produção
    }
    await prisma?.$disconnect();
  }, 60_000);

  it("bloqueia após três falhas consecutivas e persiste por dois minutos", async () => {
    expect(disponivel).toBe(true);
    const params = { filialId: "loja-01", ip: "203.0.113.10" };

    const r1 = await controle.processarTentativa({
      ...params,
      sucesso: false,
      motivo: "senha_incorreta",
    });
    const r2 = await controle.processarTentativa({
      ...params,
      sucesso: false,
      motivo: "senha_incorreta",
    });
    expect(r1.bloqueado).toBe(false);
    expect(r2.bloqueado).toBe(false);

    const r3 = await controle.processarTentativa({
      ...params,
      sucesso: false,
      motivo: "senha_incorreta",
    });
    expect(r3.bloqueado).toBe(true);
    expect(r3.bloqueadoAgora).toBe(true);

    // Persistência simulando reinício: novo cliente lê o bloqueio.
    const outroCliente = new PrismaClient({ datasourceUrl: TEST_URL });
    const bloqueio = await outroCliente.bloqueioOrigem.findUnique({
      where: { chaveOrigem: "loja-01|203.0.113.10" },
    });
    await outroCliente.$disconnect();
    expect(bloqueio).not.toBeNull();
    expect(bloqueio!.bloqueadoAte.getTime()).toBeGreaterThan(Date.now());
  });

  it("recusa tentativas durante o bloqueio e registra a tentativa", async () => {
    const params = { filialId: "loja-01", ip: "203.0.113.10" };
    const resultado = await controle.processarTentativa({
      ...params,
      sucesso: true,
      motivo: "ok",
    });
    expect(resultado.bloqueado).toBe(true);

    const tentativasBloqueadas = await prisma.tentativaLogin.count({
      where: { chaveOrigem: "loja-01|203.0.113.10", motivo: "bloqueado" },
    });
    expect(tentativasBloqueadas).toBeGreaterThanOrEqual(1);
  });

  it("libera após a expiração comparando com o horário do servidor", async () => {
    const params = { filialId: "loja-01", ip: "203.0.113.10" };
    await prisma.bloqueioOrigem.update({
      where: { chaveOrigem: "loja-01|203.0.113.10" },
      data: { bloqueadoAte: new Date(Date.now() - 1000) },
    });

    const ativo = await controle.verificarBloqueioAtivo(params);
    expect(ativo.bloqueado).toBe(false);

    const resultado = await controle.processarTentativa({
      ...params,
      sucesso: true,
      motivo: "ok",
    });
    expect(resultado.bloqueado).toBe(false);
    expect(resultado.expiracaoDetectada).toBeInstanceOf(Date);

    const bloqueio = await prisma.bloqueioOrigem.findUnique({
      where: { chaveOrigem: "loja-01|203.0.113.10" },
    });
    expect(bloqueio!.liberadoEm).not.toBeNull();
  });

  it("é seguro sob tentativas simultâneas da mesma origem", async () => {
    const params = { filialId: "loja-01", ip: "198.51.100.77" };
    await Promise.all(
      Array.from({ length: 6 }, () =>
        controle.processarTentativa({
          ...params,
          sucesso: false,
          motivo: "senha_incorreta",
        }),
      ),
    );

    const bloqueio = await prisma.bloqueioOrigem.findUnique({
      where: { chaveOrigem: "loja-01|198.51.100.77" },
    });
    expect(bloqueio).not.toBeNull();
    expect(bloqueio!.tentativasInvalidas).toBeGreaterThanOrEqual(3);

    const ativo = await controle.verificarBloqueioAtivo(params);
    expect(ativo.bloqueado).toBe(true);
  });


  it("executa o seed duas vezes sem duplicar nem sobrescrever credenciais", async () => {
    const executarSeed = () =>
      spawnSync("npx", ["tsx", "prisma/seed.ts"], {
        cwd: RAIZ,
        env: { ...process.env, DATABASE_URL: TEST_URL },
        encoding: "utf8",
      });

    const primeira = executarSeed();
    expect(primeira.status).toBe(0);
    const hashLoja01Antes = (
      await prisma.filial.findUnique({ where: { id: "loja-01" } })
    )!.senhaHash;
    const hashLoja02Antes = (
      await prisma.filial.findUnique({ where: { id: "loja-02" } })
    )!.senhaHash;

    const segunda = executarSeed();
    expect(segunda.status).toBe(0);

    const filiais = await prisma.filial.findMany();
    expect(filiais).toHaveLength(11);
    const loja01 = filiais.find((f) => f.id === "loja-01")!;
    const loja02 = filiais.find((f) => f.id === "loja-02")!;
    expect(loja01.senhaHash).toBe(hashLoja01Antes);
    expect(loja02.senhaHash).toBe(hashLoja02Antes);
    expect(loja02.senhaHash).toMatch(/^\$2[aby]\$/);
    expect(loja02.precisaTrocarSenha).toBe(true);
  }, 120_000);

  it("registra auditoria no banco e limita a consulta a 100 registros", async () => {
    for (let i = 0; i < 105; i += 1) {
      await auditoria.registrarAuditoria({
        tipoEvento: "login",
        acao: "teste",
        resultado: "falha",
        descricao: `Evento de teste ${i}`,
        contexto: { filialId: "loja-01" },
      });
    }

    const { itens, proximoCursor } = await consulta.listarLogsAuditoria({
      limite: 100,
    });
    expect(itens).toHaveLength(100);
    expect(proximoCursor).not.toBeNull();

    const total = await prisma.logAuditoria.count();
    expect(total).toBeGreaterThanOrEqual(105);

    const ordenado = itens.every(
      (item, indice) =>
        indice === 0 ||
        new Date(itens[indice - 1].criadoEm) >= new Date(item.criadoEm),
    );
    expect(ordenado).toBe(true);
  });
});
