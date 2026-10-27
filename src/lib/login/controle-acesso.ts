import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  calcularBloqueadoAte,
  calcularInicioJanela,
  chaveGlobal,
  chaveOrigem,
  contarConsecutivasInvalidas,
  LIMITE_TENTATIVAS,
} from "@/lib/login/politica";

export type Transacao = Prisma.TransactionClient;

async function buscarBloqueioAtivo(
  tx: Transacao | typeof prisma,
  chave: string,
  agoraData: Date,
): Promise<{ bloqueado: boolean; bloqueadoAte?: Date; expirado?: boolean }> {
  const bloqueio = await tx.bloqueioOrigem.findUnique({
    where: { chaveOrigem: chave },
  });
  if (!bloqueio) return { bloqueado: false };
  if (bloqueio.bloqueadoAte > agoraData) {
    return { bloqueado: true, bloqueadoAte: bloqueio.bloqueadoAte };
  }
  return { bloqueado: false, expirado: bloqueio.liberadoEm === null };
}

/**
 * Verifica bloqueio ativo por filial+IP e também por origem global (IP).
 * A expiração é calculada comparando com o horário do servidor, portanto
 * sobrevive a reinícios do processo.
 */
export async function verificarBloqueioAtivo(params: {
  filialId?: string | null;
  ip?: string | null;
}): Promise<{
  bloqueado: boolean;
  bloqueadoAte?: Date;
  expirado?: boolean;
  chave?: string;
}> {
  const agoraData = new Date();
  const chaves = [chaveOrigem(params)];
  if (params.ip) chaves.push(chaveGlobal(params.ip));

  for (const chave of chaves) {
    const resultado = await buscarBloqueioAtivo(prisma, chave, agoraData);
    if (resultado.bloqueado) {
      return { ...resultado, chave };
    }
  }

  return { bloqueado: false };
}

async function registrarTentativaTx(
  tx: Transacao,
  params: {
    filialId?: string | null;
    ip?: string | null;
    sucesso: boolean;
    motivo?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  await tx.tentativaLogin.create({
    data: {
      filialId: params.filialId ?? null,
      ipObservado: params.ip || "desconhecido",
      chaveOrigem: chaveOrigem(params),
      sucesso: params.sucesso,
      motivo: params.motivo ?? null,
      userAgent: params.userAgent?.slice(0, 255) ?? null,
    },
  });
}

async function contarInvalidasConsecutivas(
  tx: Transacao,
  chave: string,
  desde: Date,
): Promise<number> {
  const ultimas = await tx.tentativaLogin.findMany({
    where: {
      chaveOrigem: chave,
      criadoEm: { gte: desde },
      motivo: { notIn: ["bloqueado", "sem_senha"] },
    },
    orderBy: { criadoEm: "desc" },
    take: LIMITE_TENTATIVAS,
    select: { sucesso: true },
  });

  return contarConsecutivasInvalidas(ultimas);
}

export interface ResultadoTentativa {
  bloqueado: boolean;
  bloqueadoAgora: boolean;
  bloqueadoAte?: Date;
  expiracaoDetectada?: Date;
  tentativasInvalidas?: number;
}

/**
 * Registra uma tentativa de login de forma atômica.
 *
 * O advisory lock transacional serializa requisições simultâneas da mesma
 * origem, garantindo que a contagem de tentativas e a criação do bloqueio
 * não sofram corrida. Todo o estado é persistido no PostgreSQL.
 */
export async function processarTentativa(params: {
  filialId?: string | null;
  ip?: string | null;
  sucesso: boolean;
  motivo?: string | null;
  userAgent?: string | null;
}): Promise<ResultadoTentativa> {
  const chave = chaveOrigem(params);

  return prisma.$transaction(
    async (tx) => {
      // Serializa por origem dentro da transação.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chave}))`;

      const agoraData = new Date();
      const bloqueio = await tx.bloqueioOrigem.findUnique({
        where: { chaveOrigem: chave },
      });

      // Bloqueio ainda ativo: registra a tentativa e recusa.
      if (bloqueio && bloqueio.bloqueadoAte > agoraData) {
        await registrarTentativaTx(tx, {
          ...params,
          sucesso: false,
          motivo: "bloqueado",
        });
        return {
          bloqueado: true,
          bloqueadoAgora: false,
          bloqueadoAte: bloqueio.bloqueadoAte,
        };
      }

      // Bloqueio expirado: marca a liberação para rastreabilidade.
      let expiracaoDetectada: Date | undefined;
      if (bloqueio && bloqueio.liberadoEm === null) {
        expiracaoDetectada = agoraData;
        await tx.bloqueioOrigem.update({
          where: { chaveOrigem: chave },
          data: { liberadoEm: agoraData, tentativasInvalidas: 0 },
        });
      }

      await registrarTentativaTx(tx, params);

      if (params.sucesso) {
        return { bloqueado: false, bloqueadoAgora: false, expiracaoDetectada };
      }

      const inicioJanela = calcularInicioJanela(agoraData);
      const desde =
        bloqueio?.bloqueadoAte && bloqueio.bloqueadoAte > inicioJanela
          ? bloqueio.bloqueadoAte
          : inicioJanela;

      const tentativasInvalidas = await contarInvalidasConsecutivas(
        tx,
        chave,
        desde,
      );

      if (tentativasInvalidas >= LIMITE_TENTATIVAS) {
        const bloqueadoAte = calcularBloqueadoAte(agoraData);
        await tx.bloqueioOrigem.upsert({
          where: { chaveOrigem: chave },
          create: {
            id: randomUUID(),
            filialId: params.filialId ?? null,
            ipObservado: params.ip || "desconhecido",
            chaveOrigem: chave,
            escopo: "filial_ip",
            tentativasInvalidas,
            bloqueadoAte,
            ultimoBloqueioEm: agoraData,
            motivo: "tentativas_invalidas_consecutivas",
          },
          update: {
            filialId: params.filialId ?? null,
            ipObservado: params.ip || "desconhecido",
            tentativasInvalidas,
            bloqueadoAte,
            ultimoBloqueioEm: agoraData,
            liberadoEm: null,
            motivo: "tentativas_invalidas_consecutivas",
          },
        });

        // Bloqueio global por IP é opcional e deve ser habilitado apenas
        // quando a infraestrutura permitir lidar com NAT/proxies compartilhados.
        if (process.env.BLOQUEIO_GLOBAL_ATIVO === "true" && params.ip) {
          const chaveGlobalIp = chaveGlobal(params.ip);
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${chaveGlobalIp}))`;
          await tx.bloqueioOrigem.upsert({
            where: { chaveOrigem: chaveGlobalIp },
            create: {
              id: randomUUID(),
              filialId: null,
              ipObservado: params.ip,
              chaveOrigem: chaveGlobalIp,
              escopo: "global_ip",
              tentativasInvalidas,
              bloqueadoAte,
              ultimoBloqueioEm: agoraData,
              motivo: "tentativas_invalidas_consecutivas",
            },
            update: {
              tentativasInvalidas,
              bloqueadoAte,
              ultimoBloqueioEm: agoraData,
              liberadoEm: null,
              motivo: "tentativas_invalidas_consecutivas",
            },
          });
        }

        return {
          bloqueado: true,
          bloqueadoAgora: true,
          bloqueadoAte,
          expiracaoDetectada,
          tentativasInvalidas,
        };
      }

      if (bloqueio) {
        await tx.bloqueioOrigem.update({
          where: { chaveOrigem: chave },
          data: { tentativasInvalidas },
        });
      }

      return {
        bloqueado: false,
        bloqueadoAgora: false,
        expiracaoDetectada,
        tentativasInvalidas,
      };
    },
    { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 10000 },
  );
}
