import { identificarLojaTrier } from "@/lib/trier/mapeamento";
import type { GrupoTrier, LinhaTrier, PreviewTrier } from "@/lib/trier/tipos";
import { lerPlanilha, ErroPlanilha } from "@/lib/importacao/planilha";

function normalizarChaveCabecalho(cab: string): string {
  return cab
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function interpretarNumero(valor: string): number | null {
  const texto = valor.trim().replace(/\s+/g, "");
  if (!texto) return null;
  // Accept integers
  if (/^-?\d+$/.test(texto)) {
    const n = Number(texto);
    if (Number.isInteger(n)) return n;
  }
  return null;
}

function encontrarColunas(cabecalhos: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  cabecalhos.forEach((cab, idx) => {
    const chave = normalizarChaveCabecalho(cab);
    if (chave.includes("controle") && mapa.controle === undefined) mapa.controle = idx;
    else if ((chave.includes("nfiscal") || chave.includes("nserie") || chave.includes("numerofiscal")) && mapa.numeroFiscalSerie === undefined) mapa.numeroFiscalSerie = idx;
    else if (chave.includes("data") && mapa.data === undefined) mapa.data = idx;
    else if (chave === "origem" && mapa.origem === undefined) mapa.origem = idx;
    else if (chave === "destino" && mapa.destino === undefined) mapa.destino = idx;
    else if ((chave.includes("cod") && chave.includes("reduz")) || chave === "codreduzido" && mapa.codigoReduzido === undefined) mapa.codigoReduzido = idx;
    else if ((chave === "produto" || chave.includes("descricao") || chave.includes("nome")) && mapa.produto === undefined) mapa.produto = idx;
    else if (chave === "solicitado" && mapa.solicitado === undefined) mapa.solicitado = idx;
    else if (chave === "transferido" && mapa.transferido === undefined) mapa.transferido = idx;
  });
  return mapa;
}

export async function analisarArquivoTrier(
  nomeArquivo: string,
  conteudo: Buffer | Uint8Array,
): Promise<PreviewTrier> {
  const erros: string[] = [];
  const avisos: string[] = [];

  let planilha;
  try {
    planilha = await lerPlanilha(nomeArquivo, conteudo);
  } catch (e) {
    if (e instanceof ErroPlanilha) {
      return { grupos: [], erros: [e.message], avisos: [], podeConfirmar: false };
    }
    return { grupos: [], erros: ["Não foi possível ler o arquivo."], avisos: [], podeConfirmar: false };
  }

  if (planilha.linhas.length === 0) {
    return { grupos: [], erros: ["Arquivo vazio."], avisos: [], podeConfirmar: false };
  }

  const cabecalhos = planilha.linhas[0];
  const colunas = encontrarColunas(cabecalhos);

  const obrigatorias = ["controle", "origem", "destino", "codigoReduzido", "produto", "solicitado", "transferido"];
  const faltando = obrigatorias.filter((o) => colunas[o] === undefined);
  if (faltando.length > 0) {
    erros.push(`Colunas obrigatórias ausentes: ${faltando.join(", ")}.`);
    return { grupos: [], erros, avisos, podeConfirmar: false };
  }

  const linhas: LinhaTrier[] = [];
  for (let i = 1; i < planilha.linhas.length; i += 1) {
    const celulas = planilha.linhas[i];
    if (!celulas.some((c) => c?.trim())) continue;

    const controle = (celulas[colunas.controle] || "").trim();
    const numeroFiscalSerie = colunas.numeroFiscalSerie !== undefined ? (celulas[colunas.numeroFiscalSerie] || "").trim() : undefined;
    const data = colunas.data !== undefined ? (celulas[colunas.data] || "").trim() : undefined;
    const origem = (celulas[colunas.origem] || "").trim();
    const destino = (celulas[colunas.destino] || "").trim();
    const codigoReduzido = (celulas[colunas.codigoReduzido] || "").trim();
    const produto = (celulas[colunas.produto] || "").trim();
    const solicitadoStr = (celulas[colunas.solicitado] || "").trim();
    const transferidoStr = (celulas[colunas.transferido] || "").trim();

    const solicitado = interpretarNumero(solicitadoStr);
    const transferido = interpretarNumero(transferidoStr);

    const linhaErros: string[] = [];
    if (!controle) linhaErros.push("Controle ausente");
    if (!origem) linhaErros.push("Origem ausente");
    if (!destino) linhaErros.push("Destino ausente");
    if (!codigoReduzido && !produto) linhaErros.push("Produto sem identificação");
    if (solicitado !== null && solicitado < 0) linhaErros.push("Solicitado negativo");
    if (transferido !== null && transferido < 0) linhaErros.push("Transferido negativo");
    if (solicitado === null && solicitadoStr !== "") linhaErros.push("Solicitado inválido");
    if (transferido === null && transferidoStr !== "") linhaErros.push("Transferido inválido");

    linhas.push({
      controle,
      numeroFiscalSerie,
      data,
      origem,
      destino,
      codigoReduzido,
      produto,
      solicitado,
      transferido,
      linha: i + 1,
      erros: linhaErros.length > 0 ? linhaErros : undefined,
    });
  }

  if (linhas.length === 0) {
    return { grupos: [], erros: ["Nenhuma linha válida encontrada."], avisos, podeConfirmar: false };
  }

  // Group by controle + origem + destino
  const gruposMap = new Map<string, GrupoTrier>();
  for (const linha of linhas) {
    if (linha.erros && linha.erros.length > 0) {
      erros.push(`Linha ${linha.linha}: ${linha.erros.join("; ")}`);
      continue;
    }
    const chave = `${linha.controle}|${linha.origem}|${linha.destino}`;
    if (!gruposMap.has(chave)) {
      gruposMap.set(chave, {
        controle: linha.controle,
        origem: linha.origem,
        destino: linha.destino,
        itens: [],
        totalSolicitado: 0,
        totalTransferido: 0,
        quantidadeASeparar: 0,
      });
    }
    const grupo = gruposMap.get(chave)!;
    grupo.itens.push(linha);
  }

  if (erros.length > 0) {
    // Still process valid groups but mark as not confirmable
  }

  const grupos: GrupoTrier[] = [];
  for (const grupo of gruposMap.values()) {
    // Identify stores
    const origInfo = identificarLojaTrier(grupo.origem);
    const destInfo = identificarLojaTrier(grupo.destino);
    
    if (!origInfo || !origInfo.encontrado) {
      erros.push(`Origem não identificada: ${grupo.origem} (Controle ${grupo.controle})`);
    } else {
      grupo.origemLojaId = origInfo.lojaId;
    }
    
    if (!destInfo || !destInfo.encontrado) {
      erros.push(`Destino não identificado: ${grupo.destino} (Controle ${grupo.controle})`);
    } else {
      grupo.destinoLojaId = destInfo.lojaId;
    }

    if (grupo.origemLojaId && grupo.destinoLojaId && grupo.origemLojaId === grupo.destinoLojaId) {
      erros.push(`Origem igual ao destino no controle ${grupo.controle}`);
    }

    let totalSolicitado = 0;
    let totalTransferido = 0;
    let quantidadeASeparar = 0;

    for (const item of grupo.itens) {
      if (item.solicitado !== null) totalSolicitado += item.solicitado;
      if (item.transferido !== null) totalTransferido += item.transferido;
      
      if (item.transferido !== null && item.transferido > 0) {
        quantidadeASeparar += item.transferido;
      } else if (item.transferido === 0 && item.solicitado && item.solicitado > 0) {
        avisos.push(`Linha ${item.linha} (Controle ${grupo.controle}): quantidade transferida 0 com solicitado ${item.solicitado} - não incluído automaticamente`);
      } else if (item.transferido === 0 && item.solicitado === 0) {
        avisos.push(`Linha ${item.linha} (Controle ${grupo.controle}): solicitado e transferido zerados - revisar`);
      }
    }

    grupo.totalSolicitado = totalSolicitado;
    grupo.totalTransferido = totalTransferido;
    grupo.quantidadeASeparar = quantidadeASeparar;
    grupos.push(grupo);
  }

  const podeConfirmar = erros.length === 0 && grupos.length > 0 && grupos.every(g => g.origemLojaId && g.destinoLojaId && g.origemLojaId !== g.destinoLojaId);

  return { grupos, erros, avisos, podeConfirmar };
}
