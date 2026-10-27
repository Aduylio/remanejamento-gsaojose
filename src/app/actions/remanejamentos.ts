"use server";

import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

import { registrarAuditoria } from "@/lib/auditoria";
import { sessaoCompradorAtiva, obterFilialSelecionada } from "@/lib/auth/session";
import {
  alternarItemSeparadoNoBanco,
  concluirSeparacaoNoBanco,
  criarRemanejamentoManual,
  iniciarSeparacaoNoBanco,
} from "@/lib/db/remanejamentos";
import type { NovoRemanejamentoInput, Remanejamento } from "@/lib/types";

export type ResultadoAcaoRemanejamento =
  | { ok: true; remanejamento: Remanejamento }
  | { ok: false; erro: string };

function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === "P2002") {
      return "O número do remanejamento já está em uso. Tente novamente.";
    }

    if (erro.code === "P2003") {
      return "Uma das filiais informadas não existe mais no cadastro.";
    }
  }

  if (erro instanceof Error && erro.message) {
    return erro.message;
  }

  return "Não foi possível concluir a operação no banco de dados.";
}

export async function criarRemanejamentoAction(
  input: NovoRemanejamentoInput,
): Promise<ResultadoAcaoRemanejamento> {
  const cabecalhos = await headers();
  if (!(await sessaoCompradorAtiva())) {
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "criar",
      resultado: "negacao",
      descricao: "Tentativa sem autorização para criar remanejamento",
      contexto: {},
      headers: cabecalhos,
    });
    return { ok: false, erro: "Sessão do comprador expirada." };
  }

  try {
    const remanejamento = await criarRemanejamentoManual(input);
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "criar",
      resultado: "sucesso",
      descricao: "Remanejamento criado",
      contexto: {
        filialId: remanejamento.lojaOrigemId,
        sessaoId: "comprador",
        entidadeTipo: "remanejamento",
        entidadeId: remanejamento.id,
      },
      headers: cabecalhos,
    });
    return { ok: true, remanejamento };
  } catch (erro) {
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "criar",
      resultado: "falha",
      descricao: "Falha ao criar remanejamento",
      contexto: {},
      headers: cabecalhos,
    });
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}

export async function iniciarSeparacaoAction(
  remanejamentoId: string,
): Promise<ResultadoAcaoRemanejamento> {
  const cabecalhos = await headers();
  const loja = await obterFilialSelecionada();

  if (!loja) {
    await registrarAuditoria({
      tipoEvento: "autorizacao",
      acao: "iniciar_separacao",
      resultado: "negacao",
      descricao: "Tentativa sem sessão para iniciar separação",
      contexto: { entidadeTipo: "remanejamento", entidadeId: remanejamentoId },
      headers: cabecalhos,
    });
    return { ok: false, erro: "Sessão da filial expirada." };
  }

  try {
    const rem = await iniciarSeparacaoNoBanco(remanejamentoId, loja.id);
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "iniciar_separacao",
      resultado: "sucesso",
      descricao: "Separação iniciada",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: rem.id,
      },
      headers: cabecalhos,
    });
    return {
      ok: true,
      remanejamento: rem,
    };
  } catch (erro) {
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "iniciar_separacao",
      resultado: "falha",
      descricao: "Falha ao iniciar separação",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: remanejamentoId,
      },
      headers: cabecalhos,
    });
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}

export async function alternarItemSeparadoAction(
  remanejamentoId: string,
  itemId: string,
): Promise<ResultadoAcaoRemanejamento> {
  const cabecalhos = await headers();
  const loja = await obterFilialSelecionada();

  if (!loja) {
    await registrarAuditoria({
      tipoEvento: "autorizacao",
      acao: "marcar_item_separado",
      resultado: "negacao",
      descricao: "Tentativa sem sessão",
      contexto: { entidadeTipo: "remanejamento", entidadeId: remanejamentoId },
      headers: cabecalhos,
    });
    return { ok: false, erro: "Sessão da filial expirada." };
  }

  try {
    const rem = await alternarItemSeparadoNoBanco(
      remanejamentoId,
      itemId,
      loja.id,
    );
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "marcar_item_separado",
      resultado: "sucesso",
      descricao: "Item marcado/desmarcado como separado",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: rem.id,
      },
      headers: cabecalhos,
    });
    return {
      ok: true,
      remanejamento: rem,
    };
  } catch (erro) {
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "marcar_item_separado",
      resultado: "falha",
      descricao: "Falha ao marcar item",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: remanejamentoId,
      },
      headers: cabecalhos,
    });
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}

export async function concluirSeparacaoAction(
  remanejamentoId: string,
  responsavel: string,
): Promise<ResultadoAcaoRemanejamento> {
  const cabecalhos = await headers();
  const loja = await obterFilialSelecionada();

  if (!loja) {
    await registrarAuditoria({
      tipoEvento: "autorizacao",
      acao: "concluir_separacao",
      resultado: "negacao",
      descricao: "Tentativa sem sessão",
      contexto: { entidadeTipo: "remanejamento", entidadeId: remanejamentoId },
      headers: cabecalhos,
    });
    return { ok: false, erro: "Sessão da filial expirada." };
  }

  try {
    const rem = await concluirSeparacaoNoBanco(
      remanejamentoId,
      responsavel,
      loja.id,
    );
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "concluir_separacao",
      resultado: "sucesso",
      descricao: "Separação concluída",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: rem.id,
      },
      headers: cabecalhos,
    });
    return {
      ok: true,
      remanejamento: rem,
    };
  } catch (erro) {
    await registrarAuditoria({
      tipoEvento: "remanejamento",
      acao: "concluir_separacao",
      resultado: "falha",
      descricao: "Falha ao concluir separação",
      contexto: {
        filialId: loja.id,
        entidadeTipo: "remanejamento",
        entidadeId: remanejamentoId,
      },
      headers: cabecalhos,
    });
    return { ok: false, erro: mensagemDeErro(erro) };
  }
}

