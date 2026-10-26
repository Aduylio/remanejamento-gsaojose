import { readSheet } from "read-excel-file/node";

import { parseCsv } from "@/lib/importacao/csv";

export const EXTENSOES_ACEITAS = [".csv", ".xlsx"] as const;

export type ExtensaoPlanilha = (typeof EXTENSOES_ACEITAS)[number];

export interface PlanilhaLida {
  /** Linhas convertidas para texto, na ordem original do arquivo. */
  linhas: string[][];
  extensao: ExtensaoPlanilha;
  codificacao?: "utf-8" | "windows-1252";
}

export class ErroPlanilha extends Error {
  readonly codigo: string;

  constructor(codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroPlanilha";
    this.codigo = codigo;
  }
}

export function obterExtensao(nomeArquivo: string): string {
  const indice = nomeArquivo.lastIndexOf(".");

  if (indice < 0) {
    return "";
  }

  return nomeArquivo.slice(indice).toLowerCase();
}

export function validarNomeArquivo(nomeArquivo: string): ExtensaoPlanilha {
  const extensao = obterExtensao(nomeArquivo);

  if (extensao === ".xls") {
    throw new ErroPlanilha(
      "formato_xls",
      "Arquivos .xls (Excel 97-2003) não são suportados. Salve a planilha como .xlsx ou .csv e envie novamente.",
    );
  }

  if (extensao !== ".csv" && extensao !== ".xlsx") {
    throw new ErroPlanilha(
      "formato_invalido",
      "Formato não suportado. Envie um arquivo .csv ou .xlsx.",
    );
  }

  return extensao;
}

function decodificarTexto(buffer: Buffer): {
  texto: string;
  codificacao: "utf-8" | "windows-1252";
} {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return {
      texto: new TextDecoder("utf-8").decode(buffer.subarray(3)),
      codificacao: "utf-8",
    };
  }

  try {
    const texto = new TextDecoder("utf-8", { fatal: true }).decode(buffer);

    return { texto, codificacao: "utf-8" };
  } catch {
    // Arquivos exportados pelo Excel em português costumam usar ANSI.
    return {
      texto: new TextDecoder("windows-1252").decode(buffer),
      codificacao: "windows-1252",
    };
  }
}

function formatarCelula(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? "" : valor.toISOString();
  }

  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) {
      return "";
    }

    // Evita notação científica para identificadores numéricos.
    return Number.isInteger(valor) && Math.abs(valor) < 1e21
      ? valor.toFixed(0)
      : String(valor);
  }

  if (typeof valor === "boolean") {
    return valor ? "VERDADEIRO" : "FALSO";
  }

  return String(valor);
}

function normalizarLinhas(linhas: readonly (readonly unknown[])[]): string[][] {
  return linhas
    .map((linha) => linha.map(formatarCelula))
    .filter((linha) => linha.some((celula) => celula.trim() !== ""));
}

/**
 * Lê o conteúdo binário de um arquivo .csv ou .xlsx e devolve as linhas como
 * texto. O parsing de negócio fica em `analisador.ts`; aqui só há extração.
 */
export async function lerPlanilha(
  nomeArquivo: string,
  conteudo: Buffer | Uint8Array,
): Promise<PlanilhaLida> {
  const extensao = validarNomeArquivo(nomeArquivo);

  if (conteudo.byteLength === 0) {
    throw new ErroPlanilha(
      "arquivo_vazio",
      "O arquivo enviado está vazio.",
    );
  }

  const buffer = Buffer.isBuffer(conteudo)
    ? conteudo
    : Buffer.from(conteudo);

  if (extensao === ".csv") {
    const { texto, codificacao } = decodificarTexto(buffer);
    const linhas = normalizarLinhas(parseCsv(texto));

    return { linhas, extensao, codificacao };
  }

  try {
    const dados = await readSheet(buffer);
    const linhas = normalizarLinhas(dados as readonly (readonly unknown[])[]);

    return { linhas, extensao };
  } catch (erro) {
    if (erro instanceof ErroPlanilha) {
      throw erro;
    }

    throw new ErroPlanilha(
      "planilha_invalida",
      "Não foi possível ler a planilha .xlsx. Verifique se o arquivo não está corrompido ou protegido por senha.",
    );
  }
}
