import type {
  DestinoPreview,
  PreviewImportacao,
} from "@/lib/importacao/tipos";
import type {
  ItemRemanejamento,
  Loja,
  LojaId,
  Remanejamento,
  VinculoImportacao,
} from "@/lib/types";

function pedidosDoDestino(destino: DestinoPreview): string[] {
  return destino.pedidos;
}

function fornecedoresDoDestino(destino: DestinoPreview): string[] {
  return destino.fornecedores;
}

function itemUnico(valores: string[]): string | undefined {
  return valores.length === 1 ? valores[0] : undefined;
}

/**
 * Constrói os remanejamentos a partir da prévia já validada no servidor.
 * Um remanejamento é criado por loja de destino. Itens com o mesmo EAN em
 * lojas diferentes permanecem separados.
 */
export function gerarRemanejamentosDaImportacao(
  preview: PreviewImportacao,
  opcoes?: { usuarioComprador?: string },
): Remanejamento[] {
  return preview.destinos
    .map((destino, indiceDestino) => {
      if (destino.lojaId === preview.lojaOrigemId) {
        return null;
      }

      const itens = destino.itens
        .map((produto, indiceItem) => {
          if (!produto.quantidade || produto.quantidade <= 0) {
            return null;
          }

          const id = `imp-${preview.importacaoId}-${destino.lojaId}-${String(indiceItem + 1).padStart(3, "0")}`;
          const item: ItemRemanejamento = {
            id,
            nome:
              produto.descricao ||
              `Produto ${produto.codigoReduzido ?? produto.ean ?? "sem descrição"}`,
            ean: produto.ean,
            quantidade: produto.quantidade,
            separado: false,
            codigoReduzido: produto.codigoReduzido,
            laboratorio: produto.laboratorio,
            pedidoNumero: produto.pedidoNumero || undefined,
            pedidoData: produto.pedidoData || undefined,
            fornecedor: produto.fornecedor || undefined,
            cnpjFilial: produto.cnpjFilial || undefined,
            nomeFilialArquivo: produto.nomeFilialArquivo || undefined,
            linhaImportada: produto.linha,
            repetidoNoPedido: produto.repetidoNoPedido,
          };

          return item;
        })
        .filter((item): item is ItemRemanejamento => item !== null);

      if (itens.length === 0) {
        return null;
      }

      const pedidos = pedidosDoDestino(destino);
      const fornecedores = fornecedoresDoDestino(destino);
      const numero = `${preview.referencia}-${String(indiceDestino + 1).padStart(2, "0")}`;
      const vinculo: VinculoImportacao = {
        importacaoId: preview.importacaoId,
        referencia: preview.referencia,
        arquivo: preview.arquivo,
        importadoEm: preview.criadoEm,
        lojaOrigemFisicaId: preview.lojaOrigemId,
        usuarioComprador: opcoes?.usuarioComprador,
        pedidos,
        fornecedores,
        cnpjFilial: destino.cnpj,
        nomeFilialArquivo: itens[0]?.nomeFilialArquivo,
      };

      const remanejamento: Remanejamento = {
        id: `imp-${preview.importacaoId}-${destino.lojaId}`,
        numero,
        lojaOrigemId: preview.lojaOrigemId,
        destinos: [{ lojaId: destino.lojaId, itens }],
        observacoes: `Importação ${preview.referencia} · ${preview.arquivo}`,
        criadoEm: preview.criadoEm,
        status: "pendente",
        pedidoNumero: itemUnico(pedidos),
        pedidoData: itens[0]?.pedidoData,
        fornecedor: itemUnico(fornecedores),
        importacao: vinculo,
      };

      return remanejamento;
    })
    .filter((remanejamento): remanejamento is Remanejamento => remanejamento !== null);
}

export function validarPreviewParaConfirmacao(
  preview: PreviewImportacao | null,
  filiais: readonly Loja[],
): string[] {
  if (!preview) {
    return ["Prévia de importação não encontrada. Processe o arquivo novamente."];
  }

  const erros: string[] = preview.erros.map((erro) => erro.mensagem);
  const lojasPorId = new Map(filiais.map((loja) => [loja.id, loja]));

  if (!preview.lojaOrigemId || !lojasPorId.has(preview.lojaOrigemId)) {
    erros.push("Loja de origem inválida.");
  }

  if (!preview.importacaoId || !preview.referencia) {
    erros.push("Identificação da importação ausente.");
  }

  if (
    preview.resumo.produtosDestinados + preview.resumo.produtosNaOrigem <=
    0
  ) {
    erros.push("A importação não possui produtos válidos.");
  }

  if (preview.destinos.length === 0) {
    erros.push(
      "Nenhuma loja de destino foi identificada. Os itens da loja de origem permanecem nela e não há remanejamento a criar.",
    );
  }

  const destinosVistos = new Set<LojaId>();

  for (const destino of preview.destinos) {
    if (!lojasPorId.has(destino.lojaId)) {
      erros.push(`Loja de destino inválida: ${destino.lojaId}.`);
      continue;
    }

    if (destino.lojaId === preview.lojaOrigemId) {
      erros.push(
        "Foi detectado um destino igual à loja de origem. Nenhum remanejamento para a própria origem pode ser criado.",
      );
    }

    if (destinosVistos.has(destino.lojaId)) {
      erros.push(
        `A loja ${destino.nome} aparece mais de uma vez como destino.`,
      );
    }

    destinosVistos.add(destino.lojaId);

    const lojaOficial = lojasPorId.get(destino.lojaId);

    if (lojaOficial && destino.cnpj !== lojaOficial.cnpj) {
      erros.push(
        `O CNPJ do destino ${destino.nome} não corresponde ao cadastro oficial.`,
      );
    }

    if (destino.itens.length === 0) {
      erros.push(`O destino ${destino.nome} não possui itens.`);
    }

    for (const item of destino.itens) {
      if (
        item.quantidade === null ||
        !Number.isInteger(item.quantidade) ||
        item.quantidade <= 0
      ) {
        erros.push(
          `Item da linha ${item.linha} em ${destino.nome} possui quantidade inválida.`,
        );
      }

      if (!item.descricao && !item.codigoReduzido && !item.ean) {
        erros.push(
          `Item da linha ${item.linha} em ${destino.nome} não possui identificação suficiente.`,
        );
      }
    }
  }

  return [...new Set(erros)];
}
