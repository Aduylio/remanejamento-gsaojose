import "server-only";

import type { Prisma } from "@prisma/client";

import { reservarNumeroRemanejamento } from "@/lib/db/numeracao";
import type { RepositorioImportacoes } from "@/lib/importacao/confirmacao";
import type { PreviewImportacao } from "@/lib/importacao/tipos";
import type {
  DestinoRemanejamento,
  ItemRemanejamento,
  LojaId,
  NovoRemanejamentoInput,
  Remanejamento,
  StatusSeparacao,
  VinculoImportacao,
} from "@/lib/types";
import { prisma } from "@/lib/prisma";

const INCLUDE = {
  destinos: {
    include: {
      loja: true,
      itens: { orderBy: { criadoEm: "asc" } },
    },
    orderBy: { criadoEm: "asc" },
  },
  importacao: {
    include: {
      usuarioComprador: { select: { nome: true } },
    },
  },
} satisfies Prisma.RemanejamentoInclude;

type RemanejamentoCompleto = Prisma.RemanejamentoGetPayload<{
  include: typeof INCLUDE;
}>;

function dataIso(data: Date | null | undefined): string | undefined {
  return data ? data.toISOString() : undefined;
}

function nomesUnicos(valores: Array<string | null | undefined>): string[] {
  return [
    ...new Set(valores.filter((valor): valor is string => Boolean(valor))),
  ];
}

function mapearItem(item: RemanejamentoCompleto["destinos"][number]["itens"][number]): ItemRemanejamento {
  return {
    id: item.id,
    nome: item.nome,
    ean: item.ean ?? undefined,
    quantidade: item.quantidade,
    separado: item.separado,
    codigoReduzido: item.codigoReduzido ?? undefined,
    laboratorio: item.laboratorio ?? undefined,
    pedidoNumero: item.pedidoNumero ?? undefined,
    pedidoData: item.pedidoData ?? undefined,
    fornecedor: item.fornecedor ?? undefined,
    cnpjFilial: item.cnpjFilial ?? undefined,
    nomeFilialArquivo: item.nomeFilialArquivo ?? undefined,
    linhaImportada: item.linhaImportada ?? undefined,
    repetidoNoPedido: item.repetidoNoPedido,
  };
}

function mapearDestino(
  destino: RemanejamentoCompleto["destinos"][number],
): DestinoRemanejamento {
  return {
    lojaId: destino.lojaId as LojaId,
    itens: destino.itens.map(mapearItem),
  };
}

function mapearVinculo(
  remanejamento: RemanejamentoCompleto,
): VinculoImportacao | undefined {
  const importacao = remanejamento.importacao;

  if (!importacao) {
    return undefined;
  }

  const itens = remanejamento.destinos.flatMap((destino) => destino.itens);
  const primeiroDestino = remanejamento.destinos[0];

  return {
    importacaoId: importacao.id,
    referencia: importacao.referencia,
    arquivo: importacao.arquivo,
    importadoEm: (importacao.confirmadoEm ?? remanejamento.criadoEm).toISOString(),
    lojaOrigemFisicaId: importacao.lojaOrigemFisicaId as LojaId,
    usuarioComprador: importacao.usuarioComprador?.nome ?? undefined,
    pedidos: nomesUnicos([remanejamento.pedidoNumero, ...itens.map((item) => item.pedidoNumero)]),
    fornecedores: nomesUnicos([
      remanejamento.fornecedor,
      ...itens.map((item) => item.fornecedor),
    ]),
    cnpjFilial: primeiroDestino?.loja.cnpj ?? "",
    nomeFilialArquivo: nomesUnicos(itens.map((item) => item.nomeFilialArquivo))[0],
  };
}

export function mapearRemanejamento(
  remanejamento: RemanejamentoCompleto,
): Remanejamento {
  return {
    id: remanejamento.id,
    numero: remanejamento.numero,
    lojaOrigemId: remanejamento.lojaOrigemId as LojaId,
    destinos: remanejamento.destinos.map(mapearDestino),
    observacoes: remanejamento.observacoes ?? undefined,
    criadoEm: remanejamento.criadoEm.toISOString(),
    status: remanejamento.status as StatusSeparacao,
    responsavelSeparacao: remanejamento.responsavelSeparacao ?? undefined,
    iniciadoEm: dataIso(remanejamento.iniciadoEm),
    separadoEm: dataIso(remanejamento.separadoEm),
    pedidoNumero: remanejamento.pedidoNumero ?? undefined,
    pedidoData: remanejamento.pedidoData ?? undefined,
    fornecedor: remanejamento.fornecedor ?? undefined,
    importacao: mapearVinculo(remanejamento),
  };
}

export async function listarRemanejamentos(): Promise<Remanejamento[]> {
  const remanejamentos = await prisma.remanejamento.findMany({
    include: INCLUDE,
    orderBy: { criadoEm: "desc" },
  });

  return remanejamentos.map(mapearRemanejamento);
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

export async function criarRemanejamentoManual(
  input: NovoRemanejamentoInput,
): Promise<Remanejamento> {
  validarNovoRemanejamento(input);

  const destinos = input.destinos
    .filter((lojaId) => lojaId !== input.lojaOrigemId)
    .map((lojaId) => {
      const itens = input.produtos.flatMap((produto) => {
        const distribuicao = produto.quantidades.find(
          (quantidade) => quantidade.lojaId === lojaId,
        );

        if (!distribuicao || distribuicao.quantidade <= 0) {
          return [];
        }

        return [
          {
            nome: produto.nome.trim(),
            ean: produto.ean?.trim() || null,
            quantidade: distribuicao.quantidade,
          },
        ];
      });

      return { lojaId, itens };
    })
    .filter((destino) => destino.itens.length > 0);

  if (destinos.length === 0) {
    throw new Error("Distribua pelo menos um produto entre os destinos.");
  }

  const numero = await reservarNumeroRemanejamento();

  const criado = await prisma.remanejamento.create({
    data: {
      numero,
      lojaOrigemId: input.lojaOrigemId,
      observacoes: input.observacoes?.trim() || null,
      status: "pendente",
      destinos: {
        create: destinos.map((destino) => ({
          lojaId: destino.lojaId,
          itens: { create: destino.itens },
        })),
      },
    },
    include: INCLUDE,
  });

  return mapearRemanejamento(criado);
}

export async function iniciarSeparacaoNoBanco(
  remanejamentoId: string,
  lojaId: LojaId,
): Promise<Remanejamento> {
  const atual = await prisma.remanejamento.findUnique({
    where: { id: remanejamentoId },
    include: INCLUDE,
  });

  if (!atual) {
    throw new Error("Remanejamento não encontrado.");
  }

  if (atual.lojaOrigemId !== lojaId) {
    throw new Error("Somente a loja de origem pode iniciar esta separação.");
  }

  if (atual.status !== "pendente") {
    return mapearRemanejamento(atual);
  }

  const atualizado = await prisma.remanejamento.update({
    where: { id: remanejamentoId },
    data: { status: "em_separacao", iniciadoEm: new Date() },
    include: INCLUDE,
  });

  return mapearRemanejamento(atualizado);
}

export async function alternarItemSeparadoNoBanco(
  remanejamentoId: string,
  itemId: string,
  lojaId: LojaId,
): Promise<Remanejamento> {
  return prisma.$transaction(async (tx) => {
    const remanejamento = await tx.remanejamento.findUnique({
      where: { id: remanejamentoId },
      include: INCLUDE,
    });

    if (!remanejamento) {
      throw new Error("Remanejamento não encontrado.");
    }

    if (remanejamento.lojaOrigemId !== lojaId) {
      throw new Error("Somente a loja de origem pode alterar os itens.");
    }

    if (remanejamento.status === "separada") {
      throw new Error("A separação já foi concluída e não pode ser alterada.");
    }

    const item = remanejamento.destinos
      .flatMap((destino) => destino.itens)
      .find((itemAtual) => itemAtual.id === itemId);

    if (!item) {
      throw new Error("Item do remanejamento não encontrado.");
    }

    const agoraSeparado = !item.separado;

    await tx.itemRemanejamento.update({
      where: { id: itemId },
      data: { separado: agoraSeparado },
    });

    if (agoraSeparado && remanejamento.status === "pendente") {
      await tx.remanejamento.update({
        where: { id: remanejamentoId },
        data: { status: "em_separacao", iniciadoEm: new Date() },
      });
    }

    const atualizado = await tx.remanejamento.findUniqueOrThrow({
      where: { id: remanejamentoId },
      include: INCLUDE,
    });

    return mapearRemanejamento(atualizado);
  });
}

export async function concluirSeparacaoNoBanco(
  remanejamentoId: string,
  responsavel: string,
  lojaId: LojaId,
): Promise<Remanejamento> {
  const nome = responsavel.trim();

  if (nome.length < 3) {
    throw new Error("Informe o nome do colaborador responsável.");
  }

  return prisma.$transaction(async (tx) => {
    const remanejamento = await tx.remanejamento.findUnique({
      where: { id: remanejamentoId },
      include: INCLUDE,
    });

    if (!remanejamento) {
      throw new Error("Remanejamento não encontrado.");
    }

    if (remanejamento.lojaOrigemId !== lojaId) {
      throw new Error("Somente a loja de origem pode concluir esta separação.");
    }

    if (remanejamento.status === "separada") {
      return mapearRemanejamento(remanejamento);
    }

    const possuiItemPendente = remanejamento.destinos.some((destino) =>
      destino.itens.some((item) => !item.separado),
    );

    if (possuiItemPendente) {
      throw new Error("Marque todos os itens como separados antes de concluir.");
    }

    const atualizado = await tx.remanejamento.update({
      where: { id: remanejamentoId },
      data: {
        status: "separada",
        responsavelSeparacao: nome,
        separadoEm: new Date(),
      },
      include: INCLUDE,
    });

    return mapearRemanejamento(atualizado);
  });
}

export async function criarImportacaoPendente(
  preview: PreviewImportacao,
): Promise<void> {
  await prisma.importacao.create({
    data: {
      id: preview.importacaoId,
      referencia: preview.referencia,
      arquivo: preview.arquivo,
      status: "pendente",
      lojaOrigemFisicaId: preview.lojaOrigemId,
      erros: preview.erros as unknown as Prisma.InputJsonValue,
      avisos: preview.avisos as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function criarImportacaoTrierPendente(dados: {
  id: string;
  referencia: string;
  arquivo: string;
  lojaOrigemFisicaId: LojaId;
  erros: string[];
  avisos: string[];
}): Promise<void> {
  await prisma.importacao.create({
    data: {
      id: dados.id,
      referencia: dados.referencia,
      arquivo: dados.arquivo,
      status: "pendente",
      lojaOrigemFisicaId: dados.lojaOrigemFisicaId,
      erros: dados.erros as unknown as Prisma.InputJsonValue,
      avisos: dados.avisos as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function importacaoJaConfirmada(
  importacaoId: string,
): Promise<boolean> {
  const total = await prisma.importacao.count({
    where: { id: importacaoId, status: "confirmada" },
  });

  return total > 0;
}

export async function marcarImportacaoConfirmada(
  importacaoId: string,
): Promise<void> {
  await prisma.importacao.update({
    where: { id: importacaoId },
    data: { status: "confirmada", confirmadoEm: new Date() },
  });
}

function dadosDoRemanejamentoPersistido(
  remanejamento: Remanejamento,
  importacaoId: string,
  numero: string,
): Prisma.RemanejamentoCreateInput {
  return {
    numero,
    importacao: { connect: { id: importacaoId } },
    status: remanejamento.status,
    lojaOrigem: { connect: { id: remanejamento.lojaOrigemId } },
    observacoes: remanejamento.observacoes ?? null,
    pedidoNumero: remanejamento.pedidoNumero ?? null,
    pedidoData: remanejamento.pedidoData ?? null,
    fornecedor: remanejamento.fornecedor ?? null,
    responsavelSeparacao: remanejamento.responsavelSeparacao ?? null,
    iniciadoEm: remanejamento.iniciadoEm
      ? new Date(remanejamento.iniciadoEm)
      : null,
    separadoEm: remanejamento.separadoEm
      ? new Date(remanejamento.separadoEm)
      : null,
    criadoEm: new Date(remanejamento.criadoEm),
    destinos: {
      create: remanejamento.destinos.map((destino) => ({
        loja: { connect: { id: destino.lojaId } },
        itens: {
          create: destino.itens.map((item) => ({
            nome: item.nome,
            ean: item.ean ?? null,
            quantidade: item.quantidade,
            separado: item.separado,
            codigoReduzido: item.codigoReduzido ?? null,
            laboratorio: item.laboratorio ?? null,
            pedidoNumero: item.pedidoNumero ?? null,
            pedidoData: item.pedidoData ?? null,
            fornecedor: item.fornecedor ?? null,
            cnpjFilial: item.cnpjFilial || null,
            nomeFilialArquivo: item.nomeFilialArquivo ?? null,
            linhaImportada: item.linhaImportada ?? null,
            repetidoNoPedido: item.repetidoNoPedido ?? false,
          })),
        },
      })),
    },
  };
}

export function criarRepositorioImportacoesPrisma(
  importacaoId: string,
): RepositorioImportacoes {
  return {
    async inserirLoteAtomico(remanejamentos) {
      return prisma.$transaction(async (tx) => {
        const confirmadas = await tx.importacao.updateMany({
          where: { id: importacaoId, status: "pendente" },
          data: { status: "confirmada", confirmadoEm: new Date() },
        });

        if (confirmadas.count === 0) {
          throw new Error(
            "Esta importação já foi confirmada. Nenhum remanejamento novo foi criado.",
          );
        }

        const persistidos: Remanejamento[] = [];

        for (const remanejamento of remanejamentos) {
          const numero = await reservarNumeroRemanejamento(undefined, tx);
          const criado = await tx.remanejamento.create({
            data: dadosDoRemanejamentoPersistido(
              remanejamento,
              importacaoId,
              numero,
            ),
            include: INCLUDE,
          });

          persistidos.push(mapearRemanejamento(criado));
        }

        return persistidos;
      });
    },
  };
}
