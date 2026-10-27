import "server-only";

import { ResultadoAuditoria } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { obterIpObservado } from "@/lib/ip";
import type { Prisma } from "@prisma/client";

export type TipoEventoAuditoria =
  | "login"
  | "logout"
  | "remanejamento"
  | "importacao"
  | "autorizacao"
  | "credencial"
  | "permissao"
  | "bloqueio";

export type ResultadoEventoAuditoria = "sucesso" | "falha" | "bloqueio" | "negacao";

export interface ContextoAuditoria {
  filialId?: string | null;
  usuarioId?: string | null;
  sessaoId?: string | null;
  origemId?: string | null;
  entidadeTipo?: string | null;
  entidadeId?: string | null;
  metadados?: Record<string, unknown> | null;
  geolocalizacao?: Record<string, unknown> | null;
  descricao?: string | null;
}

function mapearResultado(
  resultado: ResultadoEventoAuditoria,
): ResultadoAuditoria {
  if (resultado === "sucesso") return ResultadoAuditoria.sucesso;
  if (resultado === "falha") return ResultadoAuditoria.falha;
  if (resultado === "bloqueio") return ResultadoAuditoria.bloqueio;
  return ResultadoAuditoria.negacao;
}

export async function registrarAuditoria(params: {
  tipoEvento: TipoEventoAuditoria | string;
  acao: string;
  resultado: ResultadoEventoAuditoria;
  descricao: string;
  contexto?: ContextoAuditoria;
  headers?: Headers | Record<string, string>;
}): Promise<void> {
  try {
    const infoIp = obterIpObservado(params.headers);
    await prisma.logAuditoria.create({
      data: {
        tipoEvento: params.tipoEvento,
        acao: params.acao,
        resultado: mapearResultado(params.resultado),
        descricao: params.descricao,
        filialId: params.contexto?.filialId ?? null,
        usuarioId: params.contexto?.usuarioId ?? null,
        sessaoId: params.contexto?.sessaoId ?? null,
        origemId: params.contexto?.origemId ?? null,
        ipObservado: infoIp.ip,
        ipFonte: infoIp.fonte,
        geolocalizacao: (params.contexto?.geolocalizacao as Prisma.InputJsonValue) ?? undefined,
        entidadeTipo: params.contexto?.entidadeTipo ?? null,
        entidadeId: params.contexto?.entidadeId ?? null,
        metadados: (params.contexto?.metadados as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch {
    // Nunca falhar o fluxo principal por causa de auditoria
  }
}
