"use server";

import { randomUUID } from "node:crypto";

import { confirmarImportacao } from "@/lib/importacao/confirmacao";
import { analisarLinhas } from "@/lib/importacao/analisador";
import { ErroPlanilha, lerPlanilha } from "@/lib/importacao/planilha";
import { criarRepositorioRemanejamentosEmMemoria } from "@/lib/importacao/repositorio";
import type {
  PreviewImportacao,
  ResultadoConfirmacaoImportacao,
  ResultadoPreparacaoImportacao,
} from "@/lib/importacao/tipos";
import { sessaoCompradorAtiva } from "@/lib/auth/session";
import { isLojaId } from "@/data/lojas";

const DURACAO_PREVIA_MS = 30 * 60 * 1000;
const MAXIMO_PREVIAS = 20;
const TAMANHO_MAXIMO_ARQUIVO = 6 * 1024 * 1024;

interface EntradaPreview {
  preview: PreviewImportacao;
  token: string;
  expiraEmMs: number;
}

/**
 * Cache transitório de prévias. Em produção, esta responsabilidade deve ser
 * substituída por armazenamento durável com expiração e escopo por usuário.
 */
const previas = new Map<string, EntradaPreview>();
const referenciasConfirmadas = new Map<string, { confirmadoEm: string; referencia: string }>();

const repositorio = criarRepositorioRemanejamentosEmMemoria();

function limparPreviaExpiradas(): void {
  const agora = Date.now();

  for (const [id, entrada] of previas) {
    if (entrada.expiraEmMs <= agora) {
      previas.delete(id);
    }
  }

  while (previas.size > MAXIMO_PREVIAS) {
    const maisAntiga = previas.keys().next().value;

    if (!maisAntiga) {
      break;
    }

    previas.delete(maisAntiga);
  }
}

function criarReferencia(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value]),
  );
  const sufixo = randomUUID().replace(/\D/g, "").slice(0, 4).toUpperCase();

  return `IMP-${valores.year}${valores.month}${valores.day}-${sufixo}`;
}

function nomeArquivoSeguro(nome: string): string {
  return nome.split(/[\\/]/).pop()?.trim() || "arquivo";
}

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroPlanilha) {
    return erro.message;
  }

  return "Não foi possível processar o arquivo. Nenhum remanejamento foi criado.";
}

export async function prepararImportacaoDoPedido(
  formData: FormData,
): Promise<ResultadoPreparacaoImportacao> {
  if (!(await sessaoCompradorAtiva())) {
    return {
      status: "erro",
      mensagem:
        "Sessão do comprador expirada. Entre novamente para importar pedidos.",
    };
  }

  const lojaOrigemId = String(formData.get("lojaOrigemId") ?? "");
  const arquivo = formData.get("arquivo");

  if (!isLojaId(lojaOrigemId)) {
    return {
      status: "erro",
      mensagem: "Selecione a loja física que recebeu o pedido antes de enviar o arquivo.",
    };
  }

  if (!(arquivo instanceof File)) {
    return {
      status: "erro",
      mensagem: "Selecione um arquivo .csv ou .xlsx para continuar.",
    };
  }

  if (arquivo.size === 0) {
    return { status: "erro", mensagem: "O arquivo selecionado está vazio." };
  }

  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return {
      status: "erro",
      mensagem:
        "O arquivo excede o limite de 6 MB. Divida o pedido em arquivos menores.",
    };
  }

  const nomeRemanejamento = String(formData.get("nomeRemanejamento") ?? "").trim();
  if (!nomeRemanejamento) {
    return {
      status: "erro",
      mensagem: "Informe o nome do remanejamento.",
    };
  }

  try {
    const conteudo = Buffer.from(await arquivo.arrayBuffer());
    const planilha = await lerPlanilha(arquivo.name, conteudo);
    const agora = new Date();
    const importacaoId = randomUUID();
    const referencia = criarReferencia(agora);
    const analise = analisarLinhas(planilha.linhas, {
      lojaOrigemId,
      arquivo: nomeArquivoSeguro(arquivo.name),
      importacaoId,
      referencia,
      criadoEm: agora.toISOString(),
    });

    limparPreviaExpiradas();

    previas.set(importacaoId, {
      preview: analise.preview,
      token: randomUUID(),
      expiraEmMs: agora.getTime() + DURACAO_PREVIA_MS,
    });

    const entrada = previas.get(importacaoId);

    if (!entrada) {
      return {
        status: "erro",
        mensagem: "Não foi possível manter a prévia. Tente novamente.",
      };
    }

    return {
      status: "ok",
      preview: analise.preview,
      token: entrada.token,
      expiraEm: new Date(entrada.expiraEmMs).toISOString(),
    };
  } catch (erro) {
    return {
      status: "erro",
      mensagem: mensagemDeErro(erro),
    };
  }
}

export async function confirmarImportacaoDoPedido(
  importacaoId: string,
  token: string,
): Promise<ResultadoConfirmacaoImportacao> {
  if (!(await sessaoCompradorAtiva())) {
    return {
      status: "falha",
      mensagem:
        "Sessão do comprador expirada. Entre novamente antes de confirmar a importação.",
    };
  }

  const entrada = previas.get(importacaoId);

  if (!entrada) {
    return {
      status: "invalida",
      erros: [
        "A prévia desta importação não está mais disponível. Envie o arquivo novamente.",
      ],
    };
  }

  if (!token || token !== entrada.token) {
    return {
      status: "falha",
      mensagem:
        "A confirmação não corresponde à prévia analisada. Nenhum registro foi criado.",
    };
  }

  if (entrada.expiraEmMs <= Date.now()) {
    previas.delete(importacaoId);

    return {
      status: "invalida",
      erros: [
        "A prévia expirou. Envie o arquivo novamente para revisar os dados.",
      ],
    };
  }

  const jaConfirmada = referenciasConfirmadas.has(importacaoId);

  if (jaConfirmada) {
    return {
      status: "duplicada",
      mensagem:
        "Esta importação já foi confirmada. Nenhum remanejamento novo foi criado.",
    };
  }

  const resultado = confirmarImportacao({
    preview: entrada.preview,
    jaConfirmada,
    repositorio,
    marcarConfirmada: () => {
      referenciasConfirmadas.set(importacaoId, {
        confirmadoEm: new Date().toISOString(),
        referencia: entrada.preview.referencia,
      });
    },
  });

  if (resultado.status === "confirmada") {
    return {
      status: "ok",
      referencia: resultado.referencia,
      remanejamentos: resultado.remanejamentos,
      nadaACriar: resultado.nadaACriar,
    };
  }

  if (resultado.status === "duplicada") {
    return { status: "duplicada", mensagem: resultado.mensagem };
  }

  if (resultado.status === "invalida") {
    return { status: "invalida", erros: resultado.erros };
  }

  return { status: "falha", mensagem: resultado.mensagem };
}
