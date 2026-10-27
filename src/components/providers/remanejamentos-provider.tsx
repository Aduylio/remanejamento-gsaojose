"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  alternarItemSeparadoAction,
  concluirSeparacaoAction,
  criarRemanejamentoAction,
  iniciarSeparacaoAction,
} from "@/app/actions/remanejamentos";
import type {
  NovoRemanejamentoInput,
  Remanejamento,
} from "@/lib/types";

interface RemanejamentosContextValue {
  remanejamentos: Remanejamento[];
  criarRemanejamento: (input: NovoRemanejamentoInput) => Promise<Remanejamento>;
  importarRemanejamentos: (novos: Remanejamento[]) => void;
  iniciarSeparacao: (remanejamentoId: string) => Promise<void>;
  alternarItemSeparado: (
    remanejamentoId: string,
    itemId: string,
  ) => Promise<void>;
  concluirSeparacao: (
    remanejamentoId: string,
    responsavel: string,
  ) => Promise<void>;
}

const RemanejamentosContext =
  createContext<RemanejamentosContextValue | null>(null);

function validarLoteImportado(
  novos: Remanejamento[],
  existentes: Remanejamento[],
): void {
  if (!Array.isArray(novos) || novos.length === 0) {
    throw new Error("A importação não possui remanejamentos para inserir.");
  }

  const idsExistentes = new Set(
    existentes.map((remanejamento) => remanejamento.id),
  );
  const idsNovos = new Set<string>();

  for (const remanejamento of novos) {
    if (idsExistentes.has(remanejamento.id) || idsNovos.has(remanejamento.id)) {
      throw new Error(
        `O remanejamento ${remanejamento.numero} já existe. Nenhum item foi importado.`,
      );
    }

    idsNovos.add(remanejamento.id);

    if (remanejamento.destinos.length === 0) {
      throw new Error(
        `O remanejamento ${remanejamento.numero} não possui destinos.`,
      );
    }

    for (const destino of remanejamento.destinos) {
      if (destino.lojaId === remanejamento.lojaOrigemId) {
        throw new Error(
          "A importação tentou criar um remanejamento para a própria loja de origem.",
        );
      }

      for (const item of destino.itens) {
        if (!Number.isInteger(item.quantidade) || item.quantidade <= 0) {
          throw new Error(
            `O item ${item.nome} possui quantidade inválida. Nenhum item foi importado.`,
          );
        }
      }
    }
  }
}

export function RemanejamentosProvider({
  remanejamentosIniciais,
  children,
}: {
  remanejamentosIniciais: Remanejamento[];
  children: ReactNode;
}) {
  const [remanejamentos, setRemanejamentos] = useState<Remanejamento[]>(
    () => remanejamentosIniciais,
  );

  const aplicarAtualizacao = useCallback((atualizado: Remanejamento) => {
    setRemanejamentos((atuais) => {
      const existe = atuais.some((item) => item.id === atualizado.id);

      if (!existe) {
        return [atualizado, ...atuais];
      }

      return atuais.map((item) =>
        item.id === atualizado.id ? atualizado : item,
      );
    });
  }, []);

  const criarRemanejamento = useCallback(
    async (input: NovoRemanejamentoInput): Promise<Remanejamento> => {
      const resultado = await criarRemanejamentoAction(input);

      if (!resultado.ok) {
        throw new Error(resultado.erro);
      }

      aplicarAtualizacao(resultado.remanejamento);
      return resultado.remanejamento;
    },
    [aplicarAtualizacao],
  );

  const importarRemanejamentos = useCallback(
    (novos: Remanejamento[]) => {
      validarLoteImportado(novos, remanejamentos);
      setRemanejamentos((atuais) => [...novos, ...atuais]);
    },
    [remanejamentos],
  );

  const iniciarSeparacao = useCallback(
    async (remanejamentoId: string): Promise<void> => {
      const resultado = await iniciarSeparacaoAction(remanejamentoId);

      if (!resultado.ok) {
        throw new Error(resultado.erro);
      }

      aplicarAtualizacao(resultado.remanejamento);
    },
    [aplicarAtualizacao],
  );

  const alternarItemSeparado = useCallback(
    async (remanejamentoId: string, itemId: string): Promise<void> => {
      const resultado = await alternarItemSeparadoAction(
        remanejamentoId,
        itemId,
      );

      if (!resultado.ok) {
        throw new Error(resultado.erro);
      }

      aplicarAtualizacao(resultado.remanejamento);
    },
    [aplicarAtualizacao],
  );

  const concluirSeparacao = useCallback(
    async (remanejamentoId: string, responsavel: string): Promise<void> => {
      const resultado = await concluirSeparacaoAction(
        remanejamentoId,
        responsavel,
      );

      if (!resultado.ok) {
        throw new Error(resultado.erro);
      }

      aplicarAtualizacao(resultado.remanejamento);
    },
    [aplicarAtualizacao],
  );

  const value = useMemo(
    () => ({
      remanejamentos,
      criarRemanejamento,
      importarRemanejamentos,
      iniciarSeparacao,
      alternarItemSeparado,
      concluirSeparacao,
    }),
    [
      remanejamentos,
      criarRemanejamento,
      importarRemanejamentos,
      iniciarSeparacao,
      alternarItemSeparado,
      concluirSeparacao,
    ],
  );

  return (
    <RemanejamentosContext.Provider value={value}>
      {children}
    </RemanejamentosContext.Provider>
  );
}

export function useRemanejamentos(): RemanejamentosContextValue {
  const contexto = useContext(RemanejamentosContext);

  if (!contexto) {
    throw new Error(
      "useRemanejamentos deve ser usado dentro de RemanejamentosProvider.",
    );
  }

  return contexto;
}
