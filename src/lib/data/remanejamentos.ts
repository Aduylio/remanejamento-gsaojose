import { criarRemanejamentosDemo } from "@/data/remanejamentos-demo";
import { getNomeLoja } from "@/data/lojas";
import { formatarTextoBusca, obterItens } from "@/lib/format";
import type {
  LojaId,
  RelacaoFiltro,
  Remanejamento,
  StatusFiltro,
} from "@/lib/types";

/**
 * Camada de consulta da demonstração.
 * Quando o Supabase for integrado, esta interface pode ser substituída por
 * consultas reais sem alterar os componentes de apresentação.
 */
export interface RemanejamentoRepository {
  listar(): Remanejamento[];
}

export const demoRemanejamentoRepository: RemanejamentoRepository = {
  listar: criarRemanejamentosDemo,
};

export interface FiltrosRemanejamento {
  lojaId?: LojaId;
  status?: StatusFiltro;
  relacao?: RelacaoFiltro;
  termo?: string;
}

export function ordenarPorData(
  remanejamentos: Remanejamento[],
): Remanejamento[] {
  return [...remanejamentos].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
  );
}

export function relacionadoDaLoja(
  remanejamento: Remanejamento,
  lojaId: LojaId,
): boolean {
  return (
    remanejamento.lojaOrigemId === lojaId ||
    remanejamento.destinos.some((destino) => destino.lojaId === lojaId)
  );
}

export function papelDaLoja(
  remanejamento: Remanejamento,
  lojaId: LojaId,
): "origem" | "destino" | null {
  if (remanejamento.lojaOrigemId === lojaId) {
    return "origem";
  }

  if (remanejamento.destinos.some((destino) => destino.lojaId === lojaId)) {
    return "destino";
  }

  return null;
}

function correspondeAoTermo(
  remanejamento: Remanejamento,
  termoNormalizado: string,
): boolean {
  if (!termoNormalizado) {
    return true;
  }

  const textos = [
    remanejamento.numero,
    getNomeLoja(remanejamento.lojaOrigemId),
    ...remanejamento.destinos.map((destino) => getNomeLoja(destino.lojaId)),
    remanejamento.responsavelSeparacao ?? "",
    ...obterItens(remanejamento).flatMap((item) => [item.nome, item.ean ?? ""]),
  ];

  return textos.some((texto) =>
    formatarTextoBusca(texto).includes(termoNormalizado),
  );
}

export function filtrarRemanejamentos(
  remanejamentos: Remanejamento[],
  filtros: FiltrosRemanejamento = {},
): Remanejamento[] {
  const termoNormalizado = formatarTextoBusca(filtros.termo ?? "");
  const relacao = filtros.relacao ?? "todas";

  const filtrados = remanejamentos.filter((remanejamento) => {
    if (filtros.lojaId) {
      if (relacao === "separar") {
        if (remanejamento.lojaOrigemId !== filtros.lojaId) {
          return false;
        }
      } else if (relacao === "receber") {
        const recebe = remanejamento.destinos.some(
          (destino) => destino.lojaId === filtros.lojaId,
        );

        if (!recebe || remanejamento.lojaOrigemId === filtros.lojaId) {
          return false;
        }
      } else if (!relacionadoDaLoja(remanejamento, filtros.lojaId)) {
        return false;
      }
    }

    if (
      filtros.status &&
      filtros.status !== "todos" &&
      remanejamento.status !== filtros.status
    ) {
      return false;
    }

    return correspondeAoTermo(remanejamento, termoNormalizado);
  });

  return ordenarPorData(filtrados);
}

export function tarefasDeSeparacaoDaLoja(
  remanejamentos: Remanejamento[],
  lojaId: LojaId,
): Remanejamento[] {
  return ordenarPorData(
    remanejamentos.filter(
      (remanejamento) =>
        remanejamento.lojaOrigemId === lojaId &&
        remanejamento.status !== "separada",
    ),
  );
}

export function encontrarRemanejamento(
  remanejamentos: Remanejamento[],
  id: string,
): Remanejamento | undefined {
  return remanejamentos.find((remanejamento) => remanejamento.id === id);
}
