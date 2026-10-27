import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { buscarFilialPorId } from "@/lib/db/filiais";
import type { Loja } from "@/lib/types";

const COOKIE_FILIAL = "remanejamento_filial";
const COOKIE_COMPRADOR = "remanejamento_comprador";

const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;
const SEGREDO_SESSAO =
  process.env.SESSAO_SECRET?.trim() ||
  "demonstracao-local-troque-este-segredo-em-producao";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.SESSAO_SECRET?.trim()
) {
  console.warn(
    "SESSAO_SECRET não definido em produção. Configure um segredo forte para assinar as sessões.",
  );
}

const COOKIE_SEGURO =
  process.env.COOKIE_SEGURO === "true" ||
  (process.env.NODE_ENV === "production" && process.env.VERCEL === "1");

interface PayloadComprador {
  papel: "comprador";
  criadoEm: number;
  expiraEm: number;
}

interface PayloadFilial {
  papel: "filial";
  filialId: string;
  criadoEm: number;
  expiraEm: number;
  credencialVersao: number;
}

function assinar(payload: string): string {
  return createHmac("sha256", SEGREDO_SESSAO)
    .update(payload)
    .digest("base64url");
}

function assinaturaValida(codificado: string, assinatura: string): boolean {
  const assinaturaEsperada = assinar(codificado);
  const recebida = Buffer.from(assinatura);
  const esperada = Buffer.from(assinaturaEsperada);

  if (recebida.length !== esperada.length) {
    return false;
  }

  return timingSafeEqual(recebida, esperada);
}

function criarTokenComprador(): string {
  const agora = Date.now();
  const payload: PayloadComprador = {
    papel: "comprador",
    criadoEm: agora,
    expiraEm: agora + DURACAO_SESSAO_SEGUNDOS * 1000,
  };
  const codificado = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${codificado}.${assinar(codificado)}`;
}

function validarTokenComprador(token: string): boolean {
  const [codificado, assinatura] = token.split(".");

  if (!codificado || !assinatura) {
    return false;
  }

  if (!assinaturaValida(codificado, assinatura)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(codificado, "base64url").toString("utf8"),
    ) as PayloadComprador;

    return (
      payload.papel === "comprador" &&
      Number.isFinite(payload.expiraEm) &&
      payload.expiraEm > Date.now()
    );
  } catch {
    return false;
  }
}

async function versaoCredencialDaLoja(lojaId: string): Promise<number> {
  const filial = await prisma.filial.findUnique({
    where: { id: lojaId },
    select: { senhaAlteradaEm: true },
  });
  return filial?.senhaAlteradaEm?.getTime() ?? 0;
}

async function criarTokenFilial(lojaId: string): Promise<string> {
  const agora = Date.now();
  const payload: PayloadFilial = {
    papel: "filial",
    filialId: lojaId,
    criadoEm: agora,
    expiraEm: agora + DURACAO_SESSAO_SEGUNDOS * 1000,
    credencialVersao: await versaoCredencialDaLoja(lojaId),
  };
  const codificado = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${codificado}.${assinar(codificado)}`;
}

async function validarTokenFilial(token: string): Promise<string | null> {
  const [codificado, assinatura] = token.split(".");

  if (!codificado || !assinatura) {
    return null;
  }

  if (!assinaturaValida(codificado, assinatura)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(codificado, "base64url").toString("utf8"),
    ) as PayloadFilial;

    if (
      payload.papel !== "filial" ||
      typeof payload.filialId !== "string" ||
      !Number.isFinite(payload.expiraEm) ||
      payload.expiraEm <= Date.now()
    ) {
      return null;
    }

    const versaoAtual = await versaoCredencialDaLoja(payload.filialId);
    if (payload.credencialVersao !== versaoAtual) {
      return null;
    }

    return payload.filialId;
  } catch {
    return null;
  }
}

export async function obterFilialSelecionada(): Promise<Loja | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_FILIAL)?.value;

  if (!token) {
    return undefined;
  }

  const filialId = await validarTokenFilial(token);
  return buscarFilialPorId(filialId);
}

export async function sessaoCompradorAtiva(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_COMPRADOR)?.value;

  return token ? validarTokenComprador(token) : false;
}

export async function iniciarSessaoDaLoja(lojaId: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_FILIAL, await criarTokenFilial(lojaId), {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SEGURO,
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  cookieStore.delete(COOKIE_COMPRADOR);
}

export async function iniciarSessaoDoComprador(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_COMPRADOR, criarTokenComprador(), {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SEGURO,
    path: "/",
    maxAge: DURACAO_SESSAO_SEGUNDOS,
  });
  cookieStore.delete(COOKIE_FILIAL);
}

export async function encerrarSessoes(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_FILIAL);
  cookieStore.delete(COOKIE_COMPRADOR);
}
