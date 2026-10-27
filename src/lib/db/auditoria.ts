import "server-only";

import { prisma } from "@/lib/prisma";
import type { LogAuditoria, Prisma } from "@prisma/client";

export interface FiltrosAuditoria {
  limite?: number;
  filialId?: string | null;
  tipoEvento?: string | null;
  resultado?: string | null;
  ip?: string | null;
  cursor?: string | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
}

export interface LogAuditoriaListaItem {
  id: string;
  tipoEvento: string;
  acao: string;
  resultado: string;
  descricao: string;
  filialId: string | null;
  usuarioId: string | null;
  sessaoId: string | null;
  origemId: string | null;
  ipObservado: string | null;
  ipFonte: string | null;
  geolocalizacao: unknown;
  entidadeTipo: string | null;
  entidadeId: string | null;
  metadados: unknown;
  criadoEm: string;
}

function mapear(log: LogAuditoria): LogAuditoriaListaItem {
  return {
    id: log.id,
    tipoEvento: log.tipoEvento,
    acao: log.acao,
    resultado: log.resultado,
    descricao: log.descricao,
    filialId: log.filialId,
    usuarioId: log.usuarioId,
    sessaoId: log.sessaoId,
    origemId: log.origemId,
    ipObservado: log.ipObservado,
    ipFonte: log.ipFonte,
    geolocalizacao: log.geolocalizacao,
    entidadeTipo: log.entidadeTipo,
    entidadeId: log.entidadeId,
    metadados: log.metadados,
    criadoEm: log.criadoEm.toISOString(),
  };
}

export async function listarLogsAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<{ itens: LogAuditoriaListaItem[]; proximoCursor: string | null }> {
  const limite = Math.min(Math.max(filtros.limite ?? 100, 1), 100);
  const where: Record<string, unknown> = {};

  if (filtros.filialId) where.filialId = filtros.filialId;
  if (filtros.tipoEvento) where.tipoEvento = filtros.tipoEvento;
  if (filtros.resultado) where.resultado = filtros.resultado;
  if (filtros.ip) where.ipObservado = filtros.ip;
  if (filtros.dataInicio || filtros.dataFim) {
    const criadoEm: Record<string, Date> = {};
    if (filtros.dataInicio) criadoEm.gte = filtros.dataInicio;
    if (filtros.dataFim) criadoEm.lte = filtros.dataFim;
    where.criadoEm = criadoEm;
  }

  const cursor = decodificarCursor(filtros.cursor);
  if (cursor) {
    where.OR = [
      { criadoEm: { lt: cursor.criadoEm } },
      { criadoEm: cursor.criadoEm, id: { lt: cursor.id } },
    ];
  }

  const logs = await prisma.logAuditoria.findMany({
    where: where as Prisma.LogAuditoriaWhereInput,
    orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
    take: limite + 1,
  });

  let proximoCursor: string | null = null;
  if (logs.length > limite) {
    const ultimo = logs[limite - 1];
    proximoCursor = codificarCursor(ultimo.criadoEm, ultimo.id);
  }

  const itens = logs.slice(0, limite).map(mapear);
  return { itens, proximoCursor };
}

export function codificarCursor(criadoEm: Date, id: string): string {
  return Buffer.from(`${criadoEm.toISOString()}|${id}`).toString("base64url");
}

function decodificarCursor(
  cursor: string | null | undefined,
): { criadoEm: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const [data, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
    if (!data || !id) return null;
    const criadoEm = new Date(data);
    if (Number.isNaN(criadoEm.getTime())) return null;
    return { criadoEm, id };
  } catch {
    return null;
  }
}

export function interpretarPeriodo(
  de?: string | null,
  ate?: string | null,
): { dataInicio?: Date; dataFim?: Date } {
  const resultado: { dataInicio?: Date; dataFim?: Date } = {};
  if (de) {
    const data = new Date(`${de}T00:00:00`);
    if (!Number.isNaN(data.getTime())) resultado.dataInicio = data;
  }
  if (ate) {
    const data = new Date(`${ate}T23:59:59.999`);
    if (!Number.isNaN(data.getTime())) resultado.dataFim = data;
  }
  return resultado;
}
