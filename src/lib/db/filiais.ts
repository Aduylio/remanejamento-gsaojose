import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type { Loja, LojaId } from "@/lib/types";

function mapearFilial(filial: {
  id: string;
  numero: number;
  nome: string;
  cnpj: string;
}): Loja {
  return {
    id: filial.id as LojaId,
    numero: filial.numero,
    nome: filial.nome,
    cnpj: filial.cnpj,
  };
}

export const listarFiliais = cache(async (): Promise<Loja[]> => {
  const filiais = await prisma.filial.findMany({
    where: { ativo: true },
    orderBy: { numero: "asc" },
    select: {
      id: true,
      numero: true,
      nome: true,
      cnpj: true,
    },
  });

  return filiais.map(mapearFilial);
});

export const buscarFilialPorId = cache(
  async (id: string | null | undefined): Promise<Loja | undefined> => {
    if (!id) {
      return undefined;
    }

    const filial = await prisma.filial.findFirst({
      where: { id, ativo: true },
      select: {
        id: true,
        numero: true,
        nome: true,
        cnpj: true,
      },
    });

    return filial ? mapearFilial(filial) : undefined;
  },
);

export async function filialAtivaExiste(id: string): Promise<boolean> {
  const total = await prisma.filial.count({ where: { id, ativo: true } });
  return total > 0;
}

export async function obterSenhaHashFilial(
  id: string,
): Promise<{ senhaHash: string | null; precisaTrocarSenha: boolean } | null> {
  return prisma.filial.findUnique({
    where: { id },
    select: { senhaHash: true, precisaTrocarSenha: true },
  });
}
