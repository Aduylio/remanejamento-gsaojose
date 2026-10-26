import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import type { Loja, LojaId } from "@/lib/types";

/**
 * Cadastro oficial das filiais. Esta é a única fonte de nomes e CNPJs
 * usada pela aplicação. O vínculo com arquivos importados é feito pelo
 * CNPJ normalizado, nunca pelo número da filial ou pelo nome textual.
 */
export const LOJAS: readonly Loja[] = [
  { id: "loja-01", numero: 1, nome: "Matriz", cnpj: "10846217000170" },
  {
    id: "loja-02",
    numero: 2,
    nome: "Atacadão Tabuleiro",
    cnpj: "10846217000251",
  },
  {
    id: "loja-03",
    numero: 3,
    nome: "Original Jaguaruana",
    cnpj: "10846217000332",
  },
  {
    id: "loja-04",
    numero: 4,
    nome: "Atacadão Russas",
    cnpj: "10846217000413",
  },
  {
    id: "loja-05",
    numero: 5,
    nome: "Original Filial Russas",
    cnpj: "10846217000502",
  },
  {
    id: "loja-06",
    numero: 6,
    nome: "Original Tabuleiro",
    cnpj: "10846217000685",
  },
  {
    id: "loja-07",
    numero: 7,
    nome: "Original Morada Nova",
    cnpj: "10846217000766",
  },
  {
    id: "loja-08",
    numero: 8,
    nome: "Original Aracati",
    cnpj: "10846217000847",
  },
  {
    id: "loja-09",
    numero: 9,
    nome: "Original Quixeré",
    cnpj: "10846217001061",
  },
  {
    id: "loja-10",
    numero: 10,
    nome: "Atacadão Morada Nova",
    cnpj: "10846217000928",
  },
  {
    id: "loja-11",
    numero: 11,
    nome: "Socfarm São José",
    cnpj: "08463473000137",
  },
] as const;

const LOJAS_POR_ID = new Map<string, Loja>(LOJAS.map((loja) => [loja.id, loja]));
const LOJAS_POR_CNPJ = new Map<string, Loja>(
  LOJAS.map((loja) => [loja.cnpj, loja]),
);

export function isLojaId(valor: string): valor is LojaId {
  return LOJAS_POR_ID.has(valor);
}

export function getLoja(id: string | null | undefined): Loja | undefined {
  if (!id) {
    return undefined;
  }

  return LOJAS_POR_ID.get(id);
}

export function getLojaPorCnpj(
  cnpj: string | null | undefined,
): Loja | undefined {
  const normalizado = normalizarCnpj(cnpj);

  if (normalizado.length !== 14) {
    return undefined;
  }

  return LOJAS_POR_CNPJ.get(normalizado);
}

export function getRotuloLoja(id: LojaId | string): string {
  const loja = getLoja(id);

  if (!loja) {
    return id;
  }

  return `Loja ${String(loja.numero).padStart(2, "0")} · ${loja.nome}`;
}

/** Nome completo com número, usado em listas e detalhes. */
export function getNomeLoja(id: LojaId): string {
  return getRotuloLoja(id);
}

export function getNomeOficialLoja(id: LojaId): string {
  return LOJAS_POR_ID.get(id)?.nome ?? id;
}

export function getCnpjLoja(id: LojaId): string {
  return LOJAS_POR_ID.get(id)?.cnpj ?? "";
}

export function getCnpjFormatadoLoja(id: LojaId): string {
  return formatarCnpj(getCnpjLoja(id));
}

export function listarNomesDeLojas(ids: LojaId[]): string {
  return ids.map(getNomeLoja).join(", ");
}
