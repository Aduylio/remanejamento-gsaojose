import { formatarCnpj, normalizarCnpj } from "@/lib/cnpj";
import type { Loja, LojaId } from "@/lib/types";

export interface CatalogoFiliais {
  filiais: readonly Loja[];
  isLojaId: (valor: string) => valor is LojaId;
  getLoja: (id: string | null | undefined) => Loja | undefined;
  getLojaPorCnpj: (cnpj: string | null | undefined) => Loja | undefined;
  getRotuloLoja: (id: LojaId | string) => string;
  getNomeLoja: (id: LojaId) => string;
  getNomeOficialLoja: (id: LojaId) => string;
  getCnpjLoja: (id: LojaId) => string;
  getCnpjFormatadoLoja: (id: LojaId) => string;
  listarNomesDeLojas: (ids: readonly LojaId[]) => string;
}

export function criarCatalogoFiliais(
  filiaisRecebidas: readonly Loja[],
): CatalogoFiliais {
  const filiais = [...filiaisRecebidas].sort((a, b) => a.numero - b.numero);
  const porId = new Map<string, Loja>(filiais.map((loja) => [loja.id, loja]));
  const porCnpj = new Map<string, Loja>(
    filiais.map((loja) => [normalizarCnpj(loja.cnpj), loja]),
  );

  const getLoja = (id: string | null | undefined): Loja | undefined => {
    if (!id) {
      return undefined;
    }

    return porId.get(id);
  };

  const getRotuloLoja = (id: LojaId | string): string => {
    const loja = getLoja(id);

    if (!loja) {
      return id;
    }

    return `Loja ${String(loja.numero).padStart(2, "0")} · ${loja.nome}`;
  };

  const getNomeLoja = (id: LojaId): string => getRotuloLoja(id);

  return {
    filiais,
    isLojaId: (valor: string): valor is LojaId => porId.has(valor),
    getLoja,
    getLojaPorCnpj: (cnpj: string | null | undefined): Loja | undefined => {
      const normalizado = normalizarCnpj(cnpj);

      if (normalizado.length !== 14) {
        return undefined;
      }

      return porCnpj.get(normalizado);
    },
    getRotuloLoja,
    getNomeLoja,
    getNomeOficialLoja: (id: LojaId): string => getLoja(id)?.nome ?? id,
    getCnpjLoja: (id: LojaId): string => getLoja(id)?.cnpj ?? "",
    getCnpjFormatadoLoja: (id: LojaId): string =>
      formatarCnpj(getLoja(id)?.cnpj ?? ""),
    listarNomesDeLojas: (ids: readonly LojaId[]): string =>
      ids.map(getNomeLoja).join(", "),
  };
}
