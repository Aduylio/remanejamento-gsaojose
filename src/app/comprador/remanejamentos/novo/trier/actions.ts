"use server";

import { randomUUID } from "node:crypto";

import { analisarArquivoTrier } from "@/lib/trier/analisador";
import { gerarRemanejamentosDoTrier } from "@/lib/trier/gerador";
import { sessaoCompradorAtiva } from "@/lib/auth/session";
import type { PreviewTrier } from "@/lib/trier/tipos";
import { criarRepositorioRemanejamentosEmMemoria } from "@/lib/importacao/repositorio";

const DURACAO_PREVIA_MS = 30 * 60 * 1000;
const previasTrier = new Map<string, { preview: PreviewTrier; expiraEmMs: number }>();
const confirmadasTrier = new Set<string>();
const repositorioTrier = criarRepositorioRemanejamentosEmMemoria();

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
    previasTrier.set(importacaoId, {
      preview,
      expiraEmMs: Date.now() + DURACAO_PREVIA_MS,
    });
    return { status: "ok", preview, importacaoId };
  } catch (e) {
    return { status: "erro", mensagem: "Não foi possível processar o arquivo." };
  }
}

export async function confirmarImportacaoTrier(importacaoId: string) {
  if (!(await sessaoCompradorAtiva())) {
    return { status: "falha", mensagem: "Sessão expirada." };
  }

  if (confirmadasTrier.has(importacaoId)) {
    return { status: "duplicada", mensagem: "Esta importação já foi confirmada." };
  }

  const entrada = previasTrier.get(importacaoId);
  if (!entrada) {
    return { status: "invalida", erros: ["Prévia não disponível. Envie o arquivo novamente."] };
  }

  if (entrada.expiraEmMs <= Date.now()) {
    previasTrier.delete(importacaoId);
    return { status: "invalida", erros: ["Prévia expirada."] };
  }

  if (!entrada.preview.podeConfirmar || entrada.preview.erros.length > 0) {
    return { status: "invalida", erros: entrada.preview.erros.length > 0 ? entrada.preview.erros : ["Não é possível confirmar."] };
  }

  try {
    const remanejamentos = gerarRemanejamentosDoTrier(entrada.preview.grupos);
    repositorioTrier.inserirLoteAtomico(remanejamentos as any);
    confirmadasTrier.add(importacaoId);
    return { status: "ok", remanejamentos };
  } catch (e: any) {
    return { status: "falha", mensagem: e.message || "Falha ao gravar." };
  }
}
