import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getLoja } from "@/data/lojas";
import type { Loja, LojaId } from "@/lib/types";

const COOKIE_FILIAL = "remanejamento_filial";
const COOKIE_COMPRADOR = "remanejamento_comprador";

const DURACAO_SESSAO_SEGUNDOS = 60 * 60 * 8;
const SEGREDO_SESSAO =
  process.env.SESSAO_SECRET?.trim() ||
  "demonstracao-local-troque-este-segredo-em-producao";

const COOKIE_SEGURO =
  process.env.COOKIE_SEGURO === "true" ||
  (process.env.NODE_ENV === "production" && process.env.VERCEL === "1");

interface PayloadComprador {
  papel: "comprador";
  criadoEm: number;
  expiraEm: number;
}

function assinar(payload: string): string {
  return createHmac("sha256", SEGREDO_SESSAO)
    .update(payload)
    .digest("base64url");
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

  const assinaturaEsperada = assinar(codificado);
  const assinaturaRecebidaBuffer = Buffer.from(assinatura);
  const assinaturaEsperadaBuffer = Buffer.from(assinaturaEsperada);

  if (assinaturaRecebidaBuffer.length !== assinaturaEsperadaBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(assinaturaRecebidaBuffer, assinaturaEsperadaBuffer)) {
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

export async function obterFilialSelecionada(): Promise<Loja | undefined> {
  const cookieStore = await cookies();
  return getLoja(cookieStore.get(COOKIE_FILIAL)?.value);
}

export async function sessaoCompradorAtiva(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_COMPRADOR)?.value;

  return token ? validarTokenComprador(token) : false;
}

export async function iniciarSessaoDaLoja(lojaId: LojaId): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_FILIAL, lojaId, {
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
