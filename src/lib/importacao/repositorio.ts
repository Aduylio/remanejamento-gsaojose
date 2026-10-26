import type { RepositorioImportacoes } from "@/lib/importacao/confirmacao";
import type { Remanejamento } from "@/lib/types";

export interface RepositorioRemanejamentosEmMemoria
  extends RepositorioImportacoes {
  listar(): Remanejamento[];
  limpar(): void;
}

interface OpcoesRepositorioEmMemoria {
  /** Usado apenas nos testes para simular uma falha de persistência. */
  falharAoGravar?: boolean;
}

/**
 * Repositório transitório usado pela demonstração. Ele existe para garantir
 * o contrato atômico e a proteção contra dupla confirmação no servidor.
 * Não substitui uma persistência real.
 */
export function criarRepositorioRemanejamentosEmMemoria(
  opcoes: OpcoesRepositorioEmMemoria = {},
): RepositorioRemanejamentosEmMemoria {
  let registros = new Map<string, Remanejamento>();

  return {
    inserirLoteAtomico(remanejamentos) {
      if (opcoes.falharAoGravar) {
        throw new Error("Falha simulada de persistência.");
      }

      if (remanejamentos.length === 0) {
        return;
      }

      const candidato = new Map(registros);

      for (const remanejamento of remanejamentos) {
        if (candidato.has(remanejamento.id)) {
          throw new Error(
            `Remanejamento ${remanejamento.numero} já existe neste repositório.`,
          );
        }

        candidato.set(remanejamento.id, remanejamento);
      }

      registros = candidato;
    },
    listar() {
      return [...registros.values()];
    },
    limpar() {
      registros = new Map();
    },
  };
}
