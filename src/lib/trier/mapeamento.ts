import type { LojaId } from "@/lib/types";

export interface MapeamentoTrier {
  codigo?: string;
  descricaoTrier: string;
  lojaId: LojaId;
  aliasNormalizados: string[];
}

export const MAPEAMENTOS_TRIER: MapeamentoTrier[] = [
  {
    codigo: "8",
    descricaoTrier: "ORIGINAL | ARACATI",
    lojaId: "loja-08",
    aliasNormalizados: ["originalaracati"],
  },
  {
    codigo: "1",
    descricaoTrier: "ORIGINAL | RUSSAS | MATRIZ",
    lojaId: "loja-01",
    aliasNormalizados: ["originalrussasmatriz"],
  },
  {
    codigo: "2",
    descricaoTrier: "ORIGINAL | TAB | ATACADAO",
    lojaId: "loja-02",
    aliasNormalizados: ["originaltabatacadao", "originaltabatac"],
  },
  {
    codigo: "3",
    descricaoTrier: "ORIGINAL | JAGUARUANA",
    lojaId: "loja-03",
    aliasNormalizados: ["originaljaguaruana"],
  },
  {
    codigo: "4",
    descricaoTrier: "ORIGINAL | RUS | ATACADAO",
    lojaId: "loja-04",
    aliasNormalizados: ["originalrusatacadao"],
  },
  {
    codigo: "5",
    descricaoTrier: "ORIGINAL | RUSSAS | FILIAL",
    lojaId: "loja-05",
    aliasNormalizados: ["originalrussasfilial"],
  },
  {
    codigo: "6",
    descricaoTrier: "ORIGINAL | TABULEIRO",
    lojaId: "loja-06",
    aliasNormalizados: ["originaltabuleiro"],
  },
  {
    codigo: "7",
    descricaoTrier: "ORIGINAL | MORADA NOVA",
    lojaId: "loja-07",
    aliasNormalizados: ["originalmoradanova"],
  },
  {
    codigo: "9",
    descricaoTrier: "ORIGINAL | QUIXERE",
    lojaId: "loja-09",
    aliasNormalizados: ["originalquixere"],
  },
  {
    codigo: "10",
    descricaoTrier: "ORIGINAL | M NOVA | ATACADAO",
    lojaId: "loja-10",
    aliasNormalizados: ["originalmnovaatacadao"],
  },
];

function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function identificarLojaTrier(
  origemOuDestino: string,
): { lojaId: LojaId; encontrado: boolean } | null {
  if (!origemOuDestino?.trim()) {
    return null;
  }

  const textoNormalizado = normalizarTexto(origemOuDestino);

  for (const mapeamento of MAPEAMENTOS_TRIER) {
    if (mapeamento.aliasNormalizados.includes(textoNormalizado)) {
      return { lojaId: mapeamento.lojaId, encontrado: true };
    }
    const descNorm = normalizarTexto(mapeamento.descricaoTrier);
    if (textoNormalizado.includes(descNorm) || descNorm.includes(textoNormalizado)) {
      return { lojaId: mapeamento.lojaId, encontrado: true };
    }
  }

  return { lojaId: "loja-01", encontrado: false };
}
