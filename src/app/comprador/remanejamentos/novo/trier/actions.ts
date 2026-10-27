"use server";

import { randomUUID } from "node:crypto";

import { analisarArquivoTrier } from "@/lib/trier/analisador";
import { gerarRemanejamentosDoTrier } from "@/lib/trier/gerador";
import { sessaoCompradorAtiva } from "@/lib/auth/session";
import type { PreviewTrier } from "@/lib/trier/tipos";
import type { Remanejamento } from "@/lib/types";
import {
  criarImportacaoTrierPendente,
  criarRepositorioImportacoesPrisma,
  importacaoJaConfirmada,
} from "@/lib/db/remanejamentos";

type ResultadoConfirmacaoTrier =
  | { status: "ok"; remanejamentos: Remanejamento[] }
  | { status: "duplicada"; mensagem: string }
  | { status: "invalida"; erros: string[] }
  | { status: "falha"; mensagem: string };

const DURACAO_PREVIA_MS = 30 * 60 * 1000;
const previasTrier = new Map<
  string,
  { preview: PreviewTrier; expiraEmMs: number }
>();

function criarReferenciaTrier(): string {
  const data = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const sufixo = randomUUID().replace(/\D/g, "").slice(0, 8).toUpperCase();
  return `TRIER-${data}-${sufixo}`;
}

function nomeArquivoSeguro(nome: string): string {
  return nome.split(/[\\/]/).pop()?.trim() || "arquivo";
}

export async function prepararImportacaoTrier(formData: FormData): Promise<
  | { status: "ok"; preview: PreviewTrier; importacaoId: string }
  | { status: "erro"; mensagem: string }
> {
  if (!(await sessaoCompradorAtiva())) {
    return { status: "erro", mensagem: "Sessão do comprador expirada." };
  }

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) {
    return { status: "erro", mensagem: "Selecione um arquivo." };
  }

  try {
    const conteudo = Buffer.from(await arquivo.arrayBuffer());
    const preview = await analisarArquivoTrier(arquivo.name, conteudo);
    const importacaoId = randomUUID();
    const origem = preview.grupos.find(
      (grupo) => grupo.origemLojaId,
    )?.origemLojaId;

    if (origem) {
      await criarImportacaoTrierPendente({
        id: importacaoId,
        referencia: criarReferenciaTrier(),
        arquivo: nomeArquivoSeguro(arquivo.name),
        lojaOrigemFisicaId: origem,
        erros: preview.erros,
        avisos: preview.avisos,
      });
    }

    previasTrier.set(importacaoId, {
      preview,
      expiraEmMs: Date.now() + DURACAO_PREVIA_MS,
    });

    return { status: "ok", preview, importacaoId };
  } catch {
    return { status: "erro", mensagem: "Não foi possível processar o arquivo." };
  }
}

export async function confirmarImportacaoTrier(
  importacaoId: string,
): Promise<ResultadoConfirmacaoTrier> {
  if (!(await sessaoCompradorAtiva())) {
    return { status: "falha", mensagem: "Sessão expirada." };
  }

  if (await importacaoJaConfirmada(importacaoId)) {
    return {
      status: "duplicada",
      mensagem: "Esta importação já foi confirmada.",
    };
  }

  const entrada = previasTrier.get(importacaoId);
  if (!entrada) {
    return {
      status: "invalida",
      erros: ["Prévia não disponível. Envie o arquivo novamente."],
    };
  }

  if (entrada.expiraEmMs <= Date.now()) {
    previasTrier.delete(importacaoId);
    return { status: "invalida", erros: ["Prévia expirada."] };
  }

  if (!entrada.preview.podeConfirmar || entrada.preview.erros.length > 0) {
    return {
      status: "invalida",
      erros:
        entrada.preview.erros.length > 0
          ? entrada.preview.erros
          : ["Não é possível confirmar."],
    };
  }

  try {
    const remanejamentos = gerarRemanejamentosDoTrier(entrada.preview.grupos);
    const persistidos = await criarRepositorioImportacoesPrisma(
      importacaoId,
    ).inserirLoteAtomico(remanejamentos);

    return { status: "ok", remanejamentos: persistidos };
  } catch (error) {
    return {
      status: "falha",
      mensagem:
        error instanceof Error ? error.message : "Falha ao gravar.",
    };
  }
}
