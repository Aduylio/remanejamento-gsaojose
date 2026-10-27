"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { registrarAuditoria } from "@/lib/auditoria";
import { hashSenha, verificarSenha } from "@/lib/auth/filial-senha";
import {
  iniciarSessaoDaLoja,
  obterFilialSelecionada,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export interface EstadoTrocaSenha {
  erro?: string;
  sucesso?: string;
}

const TAMANHO_MINIMO = 10;

export async function trocarSenhaFilial(
  _estadoAnterior: EstadoTrocaSenha,
  formData: FormData,
): Promise<EstadoTrocaSenha> {
  const cabecalhos = await headers();
  const loja = await obterFilialSelecionada();

  if (!loja) {
    redirect("/login?erro=filial");
  }

  const senhaAtual = String(formData.get("senhaAtual") ?? "");
  const novaSenha = String(formData.get("novaSenha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (novaSenha.length < TAMANHO_MINIMO) {
    return {
      erro: `A nova senha deve ter pelo menos ${TAMANHO_MINIMO} caracteres.`,
    };
  }

  if (novaSenha !== confirmacao) {
    return { erro: "A confirmação não corresponde à nova senha." };
  }

  if (novaSenha === senhaAtual) {
    return { erro: "A nova senha deve ser diferente da senha atual." };
  }

  const filial = await prisma.filial.findUnique({
    where: { id: loja.id },
    select: { senhaHash: true },
  });

  if (!filial?.senhaHash || !verificarSenha(senhaAtual, filial.senhaHash)) {
    await registrarAuditoria({
      tipoEvento: "credencial",
      acao: "trocar_senha_filial",
      resultado: "falha",
      descricao: "Tentativa de troca de senha com credencial atual inválida",
      contexto: { filialId: loja.id },
      headers: cabecalhos,
    });
    return { erro: "Senha atual incorreta." };
  }

  try {
    await prisma.filial.update({
      where: { id: loja.id },
      data: {
        senhaHash: hashSenha(novaSenha),
        precisaTrocarSenha: false,
        senhaAlteradaEm: new Date(),
      },
    });

    await registrarAuditoria({
      tipoEvento: "credencial",
      acao: "trocar_senha_filial",
      resultado: "sucesso",
      descricao: "Senha da filial alterada",
      contexto: { filialId: loja.id },
      headers: cabecalhos,
    });

    // Renova a sessão após a troca para refletir a nova versão da credencial.
    await iniciarSessaoDaLoja(loja.id);
  } catch {
    await registrarAuditoria({
      tipoEvento: "credencial",
      acao: "trocar_senha_filial",
      resultado: "falha",
      descricao: "Falha ao alterar senha da filial",
      contexto: { filialId: loja.id },
      headers: cabecalhos,
    });
    return { erro: "Não foi possível alterar a senha. Tente novamente." };
  }

  redirect("/painel");
}
