"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { demoRemanejamentoRepository } from "@/lib/data/remanejamentos";
import type {
  ItemRemanejamento,
  NovoRemanejamentoInput,
  Remanejamento,
} from "@/lib/types";

interface RemanejamentosContextValue {
  remanejamentos: Remanejamento[];
  criarRemanejamento: (input: NovoRemanejamentoInput) => Remanejamento;
  importarRemanejamentos: (novos: Remanejamento[]) => void;
  iniciarSeparacao: (remanejamentoId: string) => void;
  alternarItemSeparado: (remanejamentoId: string, itemId: string) => void;
  concluirSeparacao: (remanejamentoId: string, responsavel: string) => void;
  restaurarDemonstracao: () => void;
}

const RemanejamentosContext =
  createContext<RemanejamentosContextValue | null>(null);

function gerarNumero(remanejamentos: Remanejamento[]): string {
  const ano = new Date().getFullYear();
  const prefixo = `REM-${ano}-`;
  const maiorSequencia = remanejamentos
    .filter((remanejamento) => remanejamento.numero.startsWith(prefixo))
    .reduce((maior, remanejamento) => {
      const sequencia = Number(remanejamento.numero.slice(prefixo.length));
      return Number.isFinite(sequencia) ? Math.max(maior, sequencia) : maior;
    }, 0);

  return `${prefixo}${String(maiorSequencia + 1).padStart(4, "0")}`;
}

function validarNovoRemanejamento(input: NovoRemanejamentoInput): void {
  if (input.destinos.length === 0) {
    throw new Error("Selecione pelo menos uma loja de destino.");
  }

  if (input.destinos.includes(input.lojaOrigemId)) {
    throw new Error("A loja de origem não pode ser também destino.");
  }

  if (input.produtos.length === 0) {
    throw new Error("Adicione pelo menos um produto.");
  }

  input.produtos.forEach((produto, indice) => {
    if (!produto.nome.trim()) {
      throw new Error(`Informe o nome do produto ${indice + 1}.`);
    }

    if (!produto.quantidades.some((quantidade) => quantidade.quantidade > 0)) {
      throw new Error(
        `Informe uma quantidade maior que zero para o produto ${indice + 1}.`,
      );
    }
  });
}

function validarLoteImportado(
  novos: Remanejamento[],
  existentes: Remanejamento[],
): void {
  if (!Array.isArray(novos) || novos.length === 0) {
    throw new Error("A importação não possui remanejamentos para inserir.");
  }

  const idsExistentes = new Set(existentes.map((remanejamento) => remanejamento.id));
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

export function RemanejamentosProvider({ children }: { children: ReactNode }) {
  const [remanejamentos, setRemanejamentos] = useState<Remanejamento[]>(() =>
    demoRemanejamentoRepository.listar(),
  );

  const criarRemanejamento = useCallback(
    (input: NovoRemanejamentoInput): Remanejamento => {
      validarNovoRemanejamento(input);

      const numero = gerarNumero(remanejamentos);
      const agora = new Date().toISOString();

      const destinos = input.destinos
        .filter((lojaId) => lojaId !== input.lojaOrigemId)
        .map((lojaId) => {
          const itens: ItemRemanejamento[] = input.produtos.flatMap(
            (produto) => {
              const distribuicao = produto.quantidades.find(
                (quantidade) => quantidade.lojaId === lojaId,
              );

              if (!distribuicao || distribuicao.quantidade <= 0) {
                return [];
              }

              return [
                {
                  id: crypto.randomUUID(),
                  nome: produto.nome.trim(),
                  ean: produto.ean?.trim() || undefined,
                  quantidade: distribuicao.quantidade,
                  separado: false,
                },
              ];
            },
          );

          return { lojaId, itens };
        })
        .filter((destino) => destino.itens.length > 0);

      if (destinos.length === 0) {
        throw new Error("Distribua pelo menos um produto entre os destinos.");
      }

      const novoRemanejamento: Remanejamento = {
        id: numero.toLowerCase(),
        numero,
        lojaOrigemId: input.lojaOrigemId,
        destinos,
        observacoes: input.observacoes?.trim() || undefined,
        criadoEm: agora,
        status: "pendente",
      };

      setRemanejamentos((atuais) => [novoRemanejamento, ...atuais]);

      return novoRemanejamento;
    },
    [remanejamentos],
  );

  const importarRemanejamentos = useCallback(
    (novos: Remanejamento[]) => {
      validarLoteImportado(novos, remanejamentos);
      setRemanejamentos((atuais) => [...novos, ...atuais]);
    },
    [remanejamentos],
  );

  const iniciarSeparacao = useCallback((remanejamentoId: string) => {
    setRemanejamentos((atuais) =>
      atuais.map((remanejamento) => {
        if (
          remanejamento.id !== remanejamentoId ||
          remanejamento.status !== "pendente"
        ) {
          return remanejamento;
        }

        return {
          ...remanejamento,
          status: "em_separacao",
          iniciadoEm: new Date().toISOString(),
        };
      }),
    );
  }, []);

  const alternarItemSeparado = useCallback(
    (remanejamentoId: string, itemId: string) => {
      setRemanejamentos((atuais) =>
        atuais.map((remanejamento) => {
          if (remanejamento.id !== remanejamentoId) {
            return remanejamento;
          }

          const destinos = remanejamento.destinos.map((destino) => ({
            ...destino,
            itens: destino.itens.map((itemAtual) =>
              itemAtual.id === itemId
                ? { ...itemAtual, separado: !itemAtual.separado }
                : itemAtual,
            ),
          }));

          const agoraTemItemSeparado = destinos.some((destino) =>
            destino.itens.some((itemAtual) => itemAtual.separado),
          );

          return {
            ...remanejamento,
            destinos,
            status:
              agoraTemItemSeparado && remanejamento.status === "pendente"
                ? "em_separacao"
                : remanejamento.status,
            iniciadoEm:
              agoraTemItemSeparado && remanejamento.status === "pendente"
                ? new Date().toISOString()
                : remanejamento.iniciadoEm,
          };
        }),
      );
    },
    [],
  );

  const concluirSeparacao = useCallback(
    (remanejamentoId: string, responsavel: string) => {
      const nome = responsavel.trim();

      if (nome.length < 3) {
        throw new Error("Informe o nome do colaborador responsável.");
      }

      const remanejamentoAtual = remanejamentos.find(
        (remanejamento) => remanejamento.id === remanejamentoId,
      );

      if (!remanejamentoAtual) {
        throw new Error("Remanejamento não encontrado.");
      }

      const possuiItemPendente = remanejamentoAtual.destinos.some((destino) =>
        destino.itens.some((itemAtual) => !itemAtual.separado),
      );

      if (possuiItemPendente) {
        throw new Error("Marque todos os itens como separados antes de concluir.");
      }

      setRemanejamentos((atuais) =>
        atuais.map((remanejamento) =>
          remanejamento.id === remanejamentoId
            ? {
                ...remanejamento,
                status: "separada",
                responsavelSeparacao: nome,
                separadoEm: new Date().toISOString(),
              }
            : remanejamento,
        ),
      );
    },
    [remanejamentos],
  );

  const restaurarDemonstracao = useCallback(() => {
    setRemanejamentos(demoRemanejamentoRepository.listar());
  }, []);

  const value = useMemo(
    () => ({
      remanejamentos,
      criarRemanejamento,
      importarRemanejamentos,
      iniciarSeparacao,
      alternarItemSeparado,
      concluirSeparacao,
      restaurarDemonstracao,
    }),
    [
      remanejamentos,
      criarRemanejamento,
      importarRemanejamentos,
      iniciarSeparacao,
      alternarItemSeparado,
      concluirSeparacao,
      restaurarDemonstracao,
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
