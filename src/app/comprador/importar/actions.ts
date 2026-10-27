"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { registrarAuditoria } from "@/lib/auditoria";
import { confirmarImportacao } from "@/lib/importacao/confirmacao";
import { analisarLinhas } from "@/lib/importacao/analisador";
import { ErroPlanilha, lerPlanilha } from "@/lib/importacao/planilha";
import {
  criarImportacaoPendente,
  criarRepositorioImportacoesPrisma,
  importacaoJaConfirmada,
  marcarImportacaoConfirmada,
} from "@/lib/db/remanejamentos";
import { listarFiliais } from "@/lib/db/filiais";
import type {
  PreviewImportacao,
  ResultadoConfirmacaoImportacao,
  ResultadoPreparacaoImportacao,
} from "@/lib/importacao/tipos";
import { sessaoCompradorAtiva } from "@/lib/auth/session";

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
  const cabecalhosPrep = await headers();
  if (!(await sessaoCompradorAtiva())) {
    await registrarAuditoria({
      tipoEvento: "autorizacao",
      acao: "preparar_importacao",
      resultado: "negacao",
      descricao: "Tentativa sem autorização para preparar importação",
      contexto: {},
      headers: cabecalhosPrep,
    });
    return {
      status: "erro",
      mensagem:
        "Sessão do comprador expirada. Entre novamente para importar pedidos.",
    };
  }

  const lojaOrigemIdInformada = String(formData.get("lojaOrigemId") ?? "");
  const arquivo = formData.get("arquivo");
  const filiais = await listarFiliais();
  const lojaOrigemId = filiais.find(
    (filial) => filial.id === lojaOrigemIdInformada,
  )?.id;

  if (!lojaOrigemId) {
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

  let importacaoId: string | undefined;

  try {
    const conteudo = Buffer.from(await arquivo.arrayBuffer());
    const planilha = await lerPlanilha(arquivo.name, conteudo);
    const agora = new Date();
    importacaoId = randomUUID();
    const referencia = criarReferencia(agora);
    const analise = analisarLinhas(planilha.linhas, {
      lojaOrigemId,
      arquivo: nomeArquivoSeguro(arquivo.name),
      importacaoId,
      referencia,
      criadoEm: agora.toISOString(),
      filiais,
    });

    await criarImportacaoPendente(analise.preview);

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

    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "validar",
      resultado: "sucesso",
      descricao: "Arquivo de importação validado com prévia disponível",
      contexto: {
        filialId: lojaOrigemId,
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
        metadados: {
          erros: analise.preview.erros.length,
          avisos: analise.preview.avisos.length,
        },
      },
      headers: cabecalhosPrep,
    });

    return {
      status: "ok",
      preview: analise.preview,
      token: entrada.token,
      expiraEm: new Date(entrada.expiraEmMs).toISOString(),
    };
  } catch (erro) {
    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "validar",
      resultado: "falha",
      descricao: "Falha ao validar arquivo de importação",
      contexto: {
        filialId: lojaOrigemId,
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
      },
      headers: cabecalhosPrep,
    });
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
  const cabecalhos = await headers();
  if (!(await sessaoCompradorAtiva())) {
    await registrarAuditoria({
      tipoEvento: "autorizacao",
      acao: "confirmar_importacao",
      resultado: "negacao",
      descricao: "Tentativa sem autorização para confirmar importação",
      contexto: {},
      headers: cabecalhos,
    });
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

  const [jaConfirmada, filiais] = await Promise.all([
    importacaoJaConfirmada(importacaoId),
    listarFiliais(),
  ]);

  if (jaConfirmada) {
    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "confirmar",
      resultado: "falha",
      descricao: "Tentativa de confirmar importação já confirmada",
      contexto: {
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
        filialId: entrada.preview.lojaOrigemId,
      },
      headers: cabecalhos,
    });
    return {
      status: "duplicada",
      mensagem:
        "Esta importação já foi confirmada. Nenhum remanejamento novo foi criado.",
    };
  }

  const resultado = await confirmarImportacao({
    preview: entrada.preview,
    jaConfirmada,
    repositorio: criarRepositorioImportacoesPrisma(importacaoId),
    marcarConfirmada: async () => {
      await marcarImportacaoConfirmada(importacaoId);
    },
    filiais,
  });

  if (resultado.status === "confirmada") {
    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "confirmar",
      resultado: "sucesso",
      descricao: "Importação confirmada",
      contexto: {
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
        filialId: entrada.preview.lojaOrigemId,
        metadados: { remanejamentos: resultado.remanejamentos.length },
      },
      headers: cabecalhos,
    });
    return {
      status: "ok",
      referencia: resultado.referencia,
      remanejamentos: resultado.remanejamentos,
      nadaACriar: resultado.nadaACriar,
    };
  }

  if (resultado.status === "duplicada") {
    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "confirmar",
      resultado: "falha",
      descricao: "Importação já confirmada",
      contexto: {
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
        filialId: entrada.preview.lojaOrigemId,
      },
      headers: cabecalhos,
    });
    return { status: "duplicada", mensagem: resultado.mensagem };
  }

  if (resultado.status === "invalida") {
    await registrarAuditoria({
      tipoEvento: "importacao",
      acao: "confirmar",
      resultado: "falha",
      descricao: "Falha na validação ao confirmar importação",
      contexto: {
        entidadeTipo: "importacao",
        entidadeId: importacaoId,
        filialId: entrada.preview.lojaOrigemId,
      },
      headers: cabecalhos,
    });
    return { status: "invalida", erros: resultado.erros };
  }

  await registrarAuditoria({
    tipoEvento: "importacao",
    acao: "confirmar",
    resultado: "falha",
    descricao: "Falha ao confirmar importação",
    contexto: {
      entidadeTipo: "importacao",
      entidadeId: importacaoId,
      filialId: entrada.preview.lojaOrigemId,
    },
    headers: cabecalhos,
  });
  return { status: "falha", mensagem: resultado.mensagem };
}
