import { criarCatalogoFiliais } from "@/lib/filiais";
import { normalizarCnpj } from "@/lib/cnpj";
import { parseCsv } from "@/lib/importacao/csv";
import type {
  AnaliseImportacao,
  BlocoPedido,
  DestinoPreview,
  OcorrenciaImportacao,
  OpcoesAnaliseImportacao,
  PreviewImportacao,
  ProdutoImportado,
} from "@/lib/importacao/tipos";
import {
  limparIdentificador,
  normalizarEan,
  normalizarRotulo,
  textoLimpo,
} from "@/lib/importacao/valores";
import type { LojaId } from "@/lib/types";

type CampoPedido = "pedido" | "data" | "fornecedor" | "cnpj" | "nomeFilial";
type CampoProduto =
  | "codigo"
  | "ean"
  | "descricao"
  | "quantidade"
  | "laboratorio";

const ROTULOS_PEDIDO: Record<CampoPedido, string[]> = {
  pedido: ["pedido", "n pedido", "numero pedido", "numero do pedido", "nr pedido"],
  data: ["data pedido", "data do pedido", "data"],
  fornecedor: ["fornecedor", "fornecedor do pedido"],
  cnpj: ["cnpj filial", "cnpj da filial", "cnpj"],
  nomeFilial: ["nome filial", "nome da filial", "filial"],
};

const ROTULOS_PRODUTO: Record<CampoProduto, string[]> = {
  codigo: ["codigo reduzido", "cod reduzido", "codigo", "cod"],
  ean: ["ean principal", "ean"],
  descricao: ["descricao", "descricao do produto", "produto"],
  quantidade: ["quantidade", "qtd", "qtde"],
  laboratorio: ["laboratorio", "lab"],
};

const ROTULOS_CONHECIDOS = new Set(
  [...Object.values(ROTULOS_PEDIDO).flat(), ...Object.values(ROTULOS_PRODUTO).flat()].map(
    (rotulo) => normalizarRotulo(rotulo),
  ),
);

interface Colunas<T extends string> {
  indices: Partial<Record<T, number>>;
  quantidade: number;
}

interface DadosPedido {
  valores: Partial<Record<CampoPedido, string>>;
  proximoIndice: number;
  linhaDados?: number;
}

function mapearCampos<T extends string>(
  celulas: string[],
  rotulos: Record<T, string[]>,
  obrigatorios: T[] = [],
  minimo = 2,
): Colunas<T> | null {
  const indices: Partial<Record<T, number>> = {};
  let quantidade = 0;

  celulas.forEach((celula, indice) => {
    const chave = normalizarRotulo(celula);

    if (!chave) {
      return;
    }

    for (const [campo, variacoes] of Object.entries(rotulos) as [T, string[]][]) {
      if (indices[campo] === undefined && variacoes.includes(chave)) {
        indices[campo] = indice;
        quantidade += 1;
        break;
      }
    }
  });

  if (quantidade < minimo) {
    return null;
  }

  if (obrigatorios.some((campo) => indices[campo] === undefined)) {
    return null;
  }

  return { indices, quantidade };
}

const OBRIGATORIOS_PEDIDO: CampoPedido[] = ["pedido", "cnpj"];
const OBRIGATORIOS_PRODUTO: CampoProduto[] = ["quantidade"];

function mapearCamposPedido(celulas: string[]): Colunas<CampoPedido> | null {
  return mapearCampos(celulas, ROTULOS_PEDIDO, OBRIGATORIOS_PEDIDO, 3);
}

function mapearCamposProduto(celulas: string[]): Colunas<CampoProduto> | null {
  return mapearCampos(celulas, ROTULOS_PRODUTO, OBRIGATORIOS_PRODUTO, 3);
}

function ehRotuloConhecido(celula: string): boolean {
  return ROTULOS_CONHECIDOS.has(normalizarRotulo(celula));
}

function lerValores<T extends string>(
  celulas: string[],
  indices: Partial<Record<T, number>>,
  offset: number,
  ignorarRotulos = true,
): Partial<Record<T, string>> {
  const valores: Partial<Record<T, string>> = {};

  for (const [campo, indice] of Object.entries(indices) as [T, number][]) {
    const bruto = celulas[indice + offset] ?? "";

    if (!bruto.trim() || (ignorarRotulos && ehRotuloConhecido(bruto))) {
      continue;
    }

    valores[campo] = textoLimpo(bruto);
  }

  return valores;
}

function contarValores<T extends string>(
  valores: Partial<Record<T, string>>,
): number {
  return Object.keys(valores).length;
}

function lerDadosPedido(
  linhas: string[][],
  indiceCabecalho: number,
  colunas: Colunas<CampoPedido>,
): DadosPedido {
  const valoresMesmaLinha0 = lerValores(
    linhas[indiceCabecalho],
    colunas.indices,
    0,
  );
  const valoresMesmaLinha1 = lerValores(
    linhas[indiceCabecalho],
    colunas.indices,
    1,
  );
  const melhorMesmaLinha =
    contarValores(valoresMesmaLinha1) > contarValores(valoresMesmaLinha0)
      ? valoresMesmaLinha1
      : valoresMesmaLinha0;

  if (contarValores(melhorMesmaLinha) > 0) {
    return {
      valores: melhorMesmaLinha,
      proximoIndice: indiceCabecalho + 1,
      linhaDados: indiceCabecalho + 1,
    };
  }

  const proximaLinha = proximaLinhaNaoVazia(linhas, indiceCabecalho + 1);

  if (proximaLinha === null) {
    return { valores: {}, proximoIndice: indiceCabecalho + 1 };
  }

  const celulas = linhas[proximaLinha];

  if (mapearCamposPedido(celulas) || mapearCamposProduto(celulas)) {
    return { valores: {}, proximoIndice: proximaLinha };
  }

  const valoresProxima0 = lerValores(celulas, colunas.indices, 0, false);
  const valoresProxima1 = lerValores(celulas, colunas.indices, 1, false);
  const melhorProxima =
    contarValores(valoresProxima1) > contarValores(valoresProxima0)
      ? valoresProxima1
      : valoresProxima0;

  if (contarValores(melhorProxima) === 0) {
    return { valores: {}, proximoIndice: proximaLinha + 1 };
  }

  return {
    valores: melhorProxima,
    proximoIndice: proximaLinha + 1,
    linhaDados: proximaLinha + 1,
  };
}

function proximaLinhaNaoVazia(
  linhas: string[][],
  indiceInicial: number,
): number | null {
  for (let indice = indiceInicial; indice < linhas.length; indice += 1) {
    if (linhas[indice].some((celula) => celula.trim() !== "")) {
      return indice;
    }
  }

  return null;
}

function interpretarQuantidade(valor: string): {
  quantidade: number | null;
  erro?: string;
} {
  const texto = textoLimpo(valor);

  if (!texto) {
    return { quantidade: null, erro: "Quantidade não informada." };
  }

  const compacto = texto.replace(/\s+/g, "");
  const semSeparadorDeMilhar = /^\d{1,3}([.,]\d{3})+$/.test(compacto)
    ? compacto.replace(/[.,]/g, "")
    : compacto;

  let numero: number | null = null;

  if (/^\d+$/.test(semSeparadorDeMilhar)) {
    numero = Number(semSeparadorDeMilhar);
  } else if (/^\d+[.,]0+$/.test(semSeparadorDeMilhar)) {
    numero = Number(semSeparadorDeMilhar.split(/[.,]/)[0]);
  }

  if (numero === null || !Number.isInteger(numero)) {
    return {
      quantidade: null,
      erro: `Quantidade inválida: "${texto}". Informe um número inteiro maior que zero.`,
    };
  }

  if (numero <= 0) {
    return {
      quantidade: null,
      erro: `Quantidade inválida: "${texto}". Informe um número inteiro maior que zero.`,
    };
  }

  return { quantidade: numero };
}

function criarProduto(
  celulas: string[],
  colunas: Colunas<CampoProduto>,
  offset: number,
  bloco: BlocoPedido,
  numeroLinha: number,
  avisos: OcorrenciaImportacao[],
  erros: OcorrenciaImportacao[],
): ProdutoImportado | null {
  const valores = lerValores(celulas, colunas.indices, offset, false);
  const codigoReduzido = limparIdentificador(valores.codigo);
  const ean = normalizarEan(valores.ean);
  const descricao = textoLimpo(valores.descricao);
  const laboratorio = textoLimpo(valores.laboratorio);
  const quantidadeInformada = textoLimpo(valores.quantidade);

  if (
    !codigoReduzido &&
    !ean &&
    !descricao &&
    !laboratorio &&
    !quantidadeInformada
  ) {
    return null;
  }

  const produto: ProdutoImportado = {
    linha: numeroLinha,
    pedidoNumero: bloco.pedidoNumero,
    pedidoData: bloco.pedidoData,
    fornecedor: bloco.fornecedor,
    cnpjFilial: bloco.cnpjNormalizado,
    nomeFilialArquivo: bloco.nomeFilialArquivo,
    codigoReduzido: codigoReduzido || undefined,
    ean: ean || undefined,
    descricao,
    laboratorio: laboratorio || undefined,
    quantidade: null,
    quantidadeInformada,
  };

  if (!descricao && !codigoReduzido && !ean) {
    produto.erroIdentificacao =
      "Produto sem descrição, código reduzido ou EAN para identificação.";
    erros.push({
      codigo: "produto_sem_identificacao",
      mensagem: `Linha ${numeroLinha}: produto sem descrição, código reduzido ou EAN.`,
      bloqueante: true,
      linha: numeroLinha,
      pedido: bloco.pedidoNumero || undefined,
    });
  } else if (!descricao) {
    avisos.push({
      codigo: "produto_sem_descricao",
      mensagem: `Linha ${numeroLinha}: produto identificado apenas por ${codigoReduzido ? `código ${codigoReduzido}` : `EAN ${ean}`}, sem descrição.`,
      bloqueante: false,
      linha: numeroLinha,
      pedido: bloco.pedidoNumero || undefined,
    });
  }

  if (!ean && (descricao || codigoReduzido)) {
    avisos.push({
      codigo: "produto_sem_ean",
      mensagem: `Linha ${numeroLinha}: produto ${descricao || codigoReduzido} sem EAN. O item será mantido pela descrição/código.`,
      bloqueante: false,
      linha: numeroLinha,
      pedido: bloco.pedidoNumero || undefined,
    });
  }

  const resultadoQuantidade = interpretarQuantidade(quantidadeInformada);
  produto.quantidade = resultadoQuantidade.quantidade;

  if (resultadoQuantidade.erro) {
    produto.erroQuantidade = resultadoQuantidade.erro;
    erros.push({
      codigo: "quantidade_invalida",
      mensagem: `Linha ${numeroLinha}: ${resultadoQuantidade.erro}`,
      bloqueante: true,
      linha: numeroLinha,
      pedido: bloco.pedidoNumero || undefined,
    });
  }

  return produto;
}

function produtoValido(produto: ProdutoImportado): boolean {
  return (
    produto.quantidade !== null &&
    produto.quantidade > 0 &&
    !produto.erroIdentificacao &&
    !produto.erroQuantidade
  );
}

function nomesUnicos(valores: Array<string | undefined>): string[] {
  return [...new Set(valores.map((valor) => textoLimpo(valor)).filter(Boolean))];
}

function chaveDoProduto(produto: ProdutoImportado): string | null {
  if (produto.ean) {
    return `ean:${produto.ean}`;
  }

  if (produto.codigoReduzido) {
    return `codigo:${produto.codigoReduzido}`;
  }

  if (produto.descricao) {
    return `descricao:${normalizarRotulo(produto.descricao)}`;
  }

  return null;
}

export function analisarLinhas(
  linhas: string[][],
  opcoes: OpcoesAnaliseImportacao,
): AnaliseImportacao {
  const erros: OcorrenciaImportacao[] = [];
  const avisos: OcorrenciaImportacao[] = [];
  const blocos: BlocoPedido[] = [];
  const filiais = criarCatalogoFiliais(opcoes.filiais);
  const linhasNaoVazias = linhas.filter((linha) =>
    linha.some((celula) => celula.trim() !== ""),
  );

  if (linhasNaoVazias.length === 0) {
    erros.push({
      codigo: "arquivo_vazio",
      mensagem: "O arquivo está vazio ou não possui linhas legíveis.",
      bloqueante: true,
    });
  }

  let blocoAtual: BlocoPedido | null = null;
  let colunasProduto: Colunas<CampoProduto> | null = null;
  let offsetProduto = 0;
  let tabelaSemBloco = false;
  let indice = 0;

  while (indice < linhas.length) {
    const celulas = linhas[indice];
    const numeroLinha = indice + 1;

    if (!celulas.some((celula) => celula.trim() !== "")) {
      indice += 1;
      continue;
    }

    const colunasPedido = mapearCamposPedido(celulas);

    if (colunasPedido) {
      const dados = lerDadosPedido(linhas, indice, colunasPedido);
      const pedidoNumero = limparIdentificador(dados.valores.pedido);
      const pedidoData = textoLimpo(dados.valores.data);
      const fornecedor = textoLimpo(dados.valores.fornecedor);
      const cnpjInformado = limparIdentificador(dados.valores.cnpj);
      const cnpjNormalizado = normalizarCnpj(cnpjInformado);
      const nomeFilialArquivo = textoLimpo(dados.valores.nomeFilial);
      const loja = filiais.getLojaPorCnpj(cnpjNormalizado);

      const bloco: BlocoPedido = {
        indice: blocos.length + 1,
        linhaCabecalho: numeroLinha,
        linhaDados: dados.linhaDados,
        pedidoNumero,
        pedidoData,
        fornecedor,
        cnpjInformado,
        cnpjNormalizado,
        nomeFilialArquivo,
        lojaId: loja?.id,
        produtos: [],
        ocorrencias: [],
      };

      const registrar = (ocorrencia: OcorrenciaImportacao) => {
        bloco.ocorrencias.push(ocorrencia);

        if (ocorrencia.bloqueante) {
          erros.push(ocorrencia);
        } else {
          avisos.push(ocorrencia);
        }
      };

      if (!cnpjInformado) {
        registrar({
          codigo: "cnpj_ausente",
          mensagem: `Pedido ${pedidoNumero || `da linha ${numeroLinha}`} sem CNPJ da filial.`,
          bloqueante: true,
          linha: numeroLinha,
          pedido: pedidoNumero || undefined,
        });
      } else if (cnpjNormalizado.length !== 14) {
        registrar({
          codigo: "cnpj_invalido",
          mensagem: `Pedido ${pedidoNumero || `da linha ${numeroLinha}`}: CNPJ "${cnpjInformado}" não possui 14 dígitos.`,
          bloqueante: true,
          linha: numeroLinha,
          pedido: pedidoNumero || undefined,
          cnpj: cnpjNormalizado || cnpjInformado,
        });
      } else if (!loja) {
        registrar({
          codigo: "cnpj_desconhecido",
          mensagem: `Pedido ${pedidoNumero || `da linha ${numeroLinha}`}: CNPJ ${cnpjInformado} não está cadastrado nas 11 filiais.`,
          bloqueante: true,
          linha: numeroLinha,
          pedido: pedidoNumero || undefined,
          cnpj: cnpjNormalizado,
        });
      }

      if (!pedidoNumero) {
        registrar({
          codigo: "pedido_sem_numero",
          mensagem: `Bloco da linha ${numeroLinha} sem número de pedido. O identificador ficará em branco.`,
          bloqueante: false,
          linha: numeroLinha,
        });
      }

      blocos.push(bloco);
      blocoAtual = bloco;
      colunasProduto = null;
      offsetProduto = 0;
      tabelaSemBloco = false;
      indice = dados.proximoIndice;
      continue;
    }

    const colunasProdutoEncontradas = mapearCamposProduto(celulas);

    if (colunasProdutoEncontradas) {
      colunasProduto = colunasProdutoEncontradas;
      offsetProduto = 0;

      if (!blocoAtual) {
        tabelaSemBloco = true;
        erros.push({
          codigo: "produtos_sem_bloco",
          mensagem: `Linha ${numeroLinha}: tabela de produtos sem bloco de pedido válido. Os produtos não serão associados a nenhuma loja.`,
          bloqueante: true,
          linha: numeroLinha,
        });
      }

      indice += 1;
      continue;
    }

    if (tabelaSemBloco) {
      erros.push({
        codigo: "produtos_sem_bloco",
        mensagem: `Linha ${numeroLinha}: produto sem bloco de pedido válido. O item não será importado.`,
        bloqueante: true,
        linha: numeroLinha,
      });
      indice += 1;
      continue;
    }

    if (colunasProduto && blocoAtual) {
      const produto = criarProduto(
        celulas,
        colunasProduto,
        offsetProduto,
        blocoAtual,
        numeroLinha,
        avisos,
        erros,
      );

      if (produto) {
        blocoAtual.produtos.push(produto);
      }

      indice += 1;
      continue;
    }

    avisos.push({
      codigo: "linha_ignorada",
      mensagem: `Linha ${numeroLinha}: conteúdo fora da estrutura de pedido/produtos foi ignorado.`,
      bloqueante: false,
      linha: numeroLinha,
    });
    indice += 1;
  }

  for (const bloco of blocos) {
    if (bloco.produtos.length === 0) {
      const ocorrencia: OcorrenciaImportacao = {
        codigo: "pedido_sem_produtos",
        mensagem: `Pedido ${bloco.pedidoNumero || `do bloco ${bloco.indice}`} (linha ${bloco.linhaCabecalho}) não possui produtos. Revise o arquivo.`,
        bloqueante: false,
        linha: bloco.linhaCabecalho,
        pedido: bloco.pedidoNumero || undefined,
        cnpj: bloco.cnpjNormalizado || undefined,
      };
      bloco.ocorrencias.push(ocorrencia);
      avisos.push(ocorrencia);
    }

    const vistos = new Map<string, number>();

    for (const produto of bloco.produtos) {
      const chave = chaveDoProduto(produto);

      if (!chave) {
        continue;
      }

      const linhaAnterior = vistos.get(chave);

      if (linhaAnterior !== undefined) {
        produto.repetidoNoPedido = true;
        const ocorrencia: OcorrenciaImportacao = {
          codigo: "produto_repetido_no_pedido",
          mensagem: `Linha ${produto.linha}: produto repetido no pedido ${bloco.pedidoNumero || bloco.indice} da mesma filial (já apareceu na linha ${linhaAnterior}). As linhas foram preservadas.`,
          bloqueante: false,
          linha: produto.linha,
          pedido: bloco.pedidoNumero || undefined,
          cnpj: bloco.cnpjNormalizado || undefined,
        };
        bloco.ocorrencias.push(ocorrencia);
        avisos.push(ocorrencia);
      } else {
        vistos.set(chave, produto.linha);
      }
    }
  }

  if (blocos.length === 0 && linhasNaoVazias.length > 0) {
    erros.push({
      codigo: "estrutura_nao_reconhecida",
      mensagem:
        "Nenhum bloco de pedido foi reconhecido. Verifique os cabeçalhos Pedido, Data Pedido, Fornecedor, CNPJ Filial e Nome Filial.",
      bloqueante: true,
    });
  }

  const produtosValidos = blocos
    .filter((bloco) => Boolean(bloco.lojaId))
    .flatMap((bloco) => bloco.produtos.filter(produtoValido));

  if (blocos.length > 0 && produtosValidos.length === 0) {
    erros.push({
      codigo: "sem_produtos_validos",
      mensagem:
        "Nenhum produto válido foi encontrado. Corrija as linhas sinalizadas antes de confirmar.",
      bloqueante: true,
    });
  }

  const destinos = agruparDestinos(blocos, opcoes.lojaOrigemId, filiais);
  const itensOrigem = blocos
    .filter((bloco) => bloco.lojaId === opcoes.lojaOrigemId)
    .flatMap((bloco) => bloco.produtos.filter(produtoValido));

  if (blocos.length > 0 && destinos.length === 0 && produtosValidos.length > 0) {
    avisos.push({
      codigo: "sem_destinos",
      mensagem:
        "Nenhum produto foi destinado a outra loja. Os itens identificados pertencem à loja de origem e permanecerão nela; não há remanejamento a criar.",
      bloqueante: false,
    });
  }

  const pedidos = nomesUnicos(blocos.map((bloco) => bloco.pedidoNumero));
  const fornecedores = nomesUnicos(blocos.map((bloco) => bloco.fornecedor));
  const lojasIdentificadas = new Set(
    blocos.map((bloco) => bloco.lojaId).filter(Boolean),
  );
  const produtosDestinados = destinos.reduce(
    (total, destino) => total + destino.itens.length,
    0,
  );
  const unidadesDestinadas = destinos.reduce(
    (total, destino) => total + destino.totalUnidades,
    0,
  );
  const unidadesNaOrigem = itensOrigem.reduce(
    (total, produto) => total + (produto.quantidade ?? 0),
    0,
  );

  const errosUnicos = deduplicarOcorrencias(erros);
  const avisosUnicos = deduplicarOcorrencias(avisos);

  const preview: PreviewImportacao = {
    importacaoId: opcoes.importacaoId,
    referencia: opcoes.referencia,
    arquivo: opcoes.arquivo,
    criadoEm: opcoes.criadoEm,
    lojaOrigemId: opcoes.lojaOrigemId,
    resumo: {
      lojaOrigemId: opcoes.lojaOrigemId,
      lojasIdentificadas: lojasIdentificadas.size,
      blocosProcessados: blocos.length,
      fornecedores,
      pedidos,
      produtosDestinados,
      unidadesDestinadas,
      produtosNaOrigem: itensOrigem.length,
      unidadesNaOrigem,
      totalDestinos: destinos.length,
    },
    destinos,
    itensOrigem,
    erros: errosUnicos,
    avisos: avisosUnicos,
    podeConfirmar:
      errosUnicos.length === 0 &&
      blocos.length > 0 &&
      produtosValidos.length > 0 &&
      destinos.length > 0 &&
      filiais.isLojaId(opcoes.lojaOrigemId),
  };

  return { preview, blocos };
}

function agruparDestinos(
  blocos: BlocoPedido[],
  lojaOrigemId: LojaId,
  filiais: ReturnType<typeof criarCatalogoFiliais>,
): DestinoPreview[] {
  const porLoja = new Map<LojaId, ProdutoImportado[]>();

  for (const bloco of blocos) {
    if (!bloco.lojaId || bloco.lojaId === lojaOrigemId) {
      continue;
    }

    const itens = bloco.produtos.filter(produtoValido);

    if (itens.length === 0) {
      continue;
    }

    porLoja.set(bloco.lojaId, [...(porLoja.get(bloco.lojaId) ?? []), ...itens]);
  }

  return [...porLoja.entries()]
    .map(([lojaId, itens]) => {
      const loja = filiais.getLoja(lojaId);

      return {
        lojaId,
        numero: loja?.numero ?? 0,
        nome: loja?.nome ?? lojaId,
        cnpj: loja?.cnpj ?? "",
        pedidos: nomesUnicos(itens.map((item) => item.pedidoNumero)),
        fornecedores: nomesUnicos(itens.map((item) => item.fornecedor)),
        itens: [...itens].sort((a, b) => a.linha - b.linha),
        totalUnidades: itens.reduce(
          (total, item) => total + (item.quantidade ?? 0),
          0,
        ),
      } satisfies DestinoPreview;
    })
    .sort((a, b) => a.numero - b.numero);
}

function deduplicarOcorrencias(
  ocorrencias: OcorrenciaImportacao[],
): OcorrenciaImportacao[] {
  const unicas = new Map<string, OcorrenciaImportacao>();

  for (const ocorrencia of ocorrencias) {
    const chave = `${ocorrencia.codigo}|${ocorrencia.linha ?? ""}|${ocorrencia.mensagem}`;

    if (!unicas.has(chave)) {
      unicas.set(chave, ocorrencia);
    }
  }

  return [...unicas.values()].sort(
    (a, b) => (a.linha ?? 0) - (b.linha ?? 0),
  );
}

export function analisarCsv(
  texto: string,
  opcoes: OpcoesAnaliseImportacao,
): AnaliseImportacao {
  return analisarLinhas(parseCsv(texto), opcoes);
}
