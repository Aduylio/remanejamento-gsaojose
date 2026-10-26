import type {
  DestinoRemanejamento,
  ItemRemanejamento,
  Remanejamento,
  StatusSeparacao,
} from "@/lib/types";

const formatadorData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const formatadorDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatarData(dataIso?: string): string {
  if (!dataIso) {
    return "—";
  }

  return formatadorData.format(new Date(dataIso));
}

export function formatarDataHora(dataIso?: string): string {
  if (!dataIso) {
    return "—";
  }

  return formatadorDataHora.format(new Date(dataIso));
}

export function formatarUnidades(quantidade: number): string {
  return `${quantidade} un.`;
}

export function obterItens(remanejamento: Remanejamento): ItemRemanejamento[] {
  return remanejamento.destinos.flatMap((destino) => destino.itens);
}

export function totalDeUnidades(remanejamento: Remanejamento): number {
  return obterItens(remanejamento).reduce(
    (total, itemAtual) => total + itemAtual.quantidade,
    0,
  );
}

export function totalDeLinhas(remanejamento: Remanejamento): number {
  return obterItens(remanejamento).length;
}

export function totalDeItensSeparados(remanejamento: Remanejamento): number {
  return obterItens(remanejamento).filter((itemAtual) => itemAtual.separado)
    .length;
}

export function progressoDaSeparacao(remanejamento: Remanejamento): {
  separados: number;
  total: number;
  percentual: number;
} {
  const total = totalDeLinhas(remanejamento);
  const separados = totalDeItensSeparados(remanejamento);

  return {
    separados,
    total,
    percentual: total === 0 ? 0 : Math.round((separados / total) * 100),
  };
}

export function totalPorDestino(destino: DestinoRemanejamento): number {
  return destino.itens.reduce(
    (total, itemAtual) => total + itemAtual.quantidade,
    0,
  );
}

export function resumirPorStatus(remanejamentos: Remanejamento[]): Record<
  StatusSeparacao,
  number
> {
  return remanejamentos.reduce(
    (resumo, remanejamento) => {
      resumo[remanejamento.status] += 1;
      return resumo;
    },
    {
      pendente: 0,
      em_separacao: 0,
      separada: 0,
    } satisfies Record<StatusSeparacao, number>,
  );
}

export function formatarTextoBusca(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
