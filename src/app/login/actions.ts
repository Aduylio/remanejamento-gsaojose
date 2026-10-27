"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { registrarAuditoria } from "@/lib/auditoria";
import { verificarSenha } from "@/lib/auth/filial-senha";
import {
  encerrarSessoes,
  iniciarSessaoDaLoja,
  iniciarSessaoDoComprador,
  obterFilialSelecionada,
  sessaoCompradorAtiva,
} from "@/lib/auth/session";
import { verificarSenhaComprador } from "@/lib/auth/password";
import {
  processarTentativa,
  verificarBloqueioAtivo,
} from "@/lib/login/controle-acesso";
import { validarLocalizacaoCliente } from "@/lib/geolocalizacao";
import { obterIpObservado } from "@/lib/ip";
import { prisma } from "@/lib/prisma";

export interface EstadoLoginComprador {
  erro?: string;
  sucesso?: boolean;
  destino?: string;
}

export interface EstadoLoginFilial {
  erro?: string;
  bloqueado?: boolean;
  bloqueadoAte?: string;
  sucesso?: boolean;
  destino?: string;
}

const ERRO_BLOQUEIO =
  "Acesso temporariamente bloqueado por tentativas inválidas. Tente novamente em 2 minutos.";

export async function acessarFilial(
  _estadoAnterior: EstadoLoginFilial,
  formData: FormData,
): Promise<EstadoLoginFilial> {
  const lojaId = String(formData.get("lojaId") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");

  if (!lojaId) {
    return { erro: "Selecione uma filial válida." };
  }

  const cabecalhos = await headers();
  const infoIp = obterIpObservado(cabecalhos);
  const ipObs = infoIp.ip || "desconhecido";
  const userAgent = cabecalhos.get("user-agent");
  const localizacaoValidada = validarLocalizacaoCliente({
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    precisao: formData.get("precisao"),
  });
  const geolocalizacao = localizacaoValidada
    ? ({ ...localizacaoValidada } as Record<string, unknown>)
    : null;

  const filial = await prisma.filial.findFirst({
    where: { id: lojaId, ativo: true },
    select: { id: true, senhaHash: true },
  });

  if (!filial) {
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_filial",
      resultado: "falha",
      descricao: "Tentativa de login com filial inválida ou inativa",
      contexto: { origemId: lojaId, geolocalizacao },
      headers: cabecalhos,
    });
    return { erro: "Selecione uma filial válida." };
  }

  // Verificação antes de validar a senha (evita custo de bcrypt durante bloqueio).
  const bloqueio = await verificarBloqueioAtivo({ filialId: filial.id, ip: ipObs });
  if (bloqueio.bloqueado) {
    await processarTentativa({
      filialId: filial.id,
      ip: ipObs,
      sucesso: false,
      motivo: "bloqueado",
      userAgent,
    });
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_filial",
      resultado: "bloqueio",
      descricao: "Tentativa de login durante bloqueio temporário",
      contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
      headers: cabecalhos,
    });
    return {
      erro: ERRO_BLOQUEIO,
      bloqueado: true,
      bloqueadoAte: bloqueio.bloqueadoAte?.toISOString(),
    };
  }

  if (!filial.senhaHash) {
    const resultado = await processarTentativa({
      filialId: filial.id,
      ip: ipObs,
      sucesso: false,
      motivo: "sem_senha",
      userAgent,
    });
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_filial",
      resultado: "falha",
      descricao: "Tentativa de login sem credencial configurada para a filial",
      contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
      headers: cabecalhos,
    });
    return {
      erro: resultado.bloqueado
        ? ERRO_BLOQUEIO
        : "Credencial da filial não configurada.",
      bloqueado: resultado.bloqueado,
      bloqueadoAte: resultado.bloqueadoAte?.toISOString(),
    };
  }

  const senhaOk = verificarSenha(senha, filial.senhaHash);
  const resultado = await processarTentativa({
    filialId: filial.id,
    ip: ipObs,
    sucesso: senhaOk,
    motivo: senhaOk ? "ok" : "senha_incorreta",
    userAgent,
  });

  if (resultado.expiracaoDetectada) {
    await registrarAuditoria({
      tipoEvento: "bloqueio",
      acao: "expirar_bloqueio",
      resultado: "sucesso",
      descricao: "Bloqueio temporário expirado automaticamente",
      contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
      headers: cabecalhos,
    });
  }

  if (resultado.bloqueado) {
    if (resultado.bloqueadoAgora) {
      await registrarAuditoria({
        tipoEvento: "bloqueio",
        acao: "bloquear_origem",
        resultado: "bloqueio",
        descricao:
          "Bloqueio aplicado após tentativas inválidas consecutivas",
        contexto: {
          filialId: filial.id,
          origemId: filial.id,
          metadados: { tentativasInvalidas: resultado.tentativasInvalidas },
        },
        headers: cabecalhos,
      });
    }
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_filial",
      resultado: "bloqueio",
      descricao: "Tentativa de login recusada por bloqueio ativo",
      contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
      headers: cabecalhos,
    });
    return {
      erro: ERRO_BLOQUEIO,
      bloqueado: true,
      bloqueadoAte: resultado.bloqueadoAte?.toISOString(),
    };
  }

  if (!senhaOk) {
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_filial",
      resultado: "falha",
      descricao: "Login com senha incorreta",
      contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
      headers: cabecalhos,
    });
    return { erro: "Senha incorreta." };
  }

  await registrarAuditoria({
    tipoEvento: "login",
    acao: "login_filial",
    resultado: "sucesso",
    descricao: "Login bem-sucedido por filial",
    contexto: { filialId: filial.id, origemId: filial.id, geolocalizacao },
    headers: cabecalhos,
  });

  await iniciarSessaoDaLoja(filial.id);
  return { sucesso: true, destino: "/painel" } as EstadoLoginFilial & {
    sucesso?: boolean;
    destino?: string;
  };
}

export async function entrarComoComprador(
  _estadoAnterior: EstadoLoginComprador,
  formData: FormData,
): Promise<EstadoLoginComprador> {
  const senha = String(formData.get("senha") ?? "");
  const cabecalhos = await headers();

  if (!senha.trim()) {
    return { erro: "Informe a senha de acesso." };
  }

  if (senha.length > 200 || !verificarSenhaComprador(senha)) {
    await registrarAuditoria({
      tipoEvento: "login",
      acao: "login_comprador",
      resultado: "falha",
      descricao: "Login do comprador com senha incorreta",
      contexto: { sessaoId: "comprador" },
      headers: cabecalhos,
    });
    return { erro: "Senha incorreta. Verifique a senha de acesso." };
  }

  await registrarAuditoria({
    tipoEvento: "login",
    acao: "login_comprador",
    resultado: "sucesso",
    descricao: "Login do comprador bem-sucedido",
    contexto: { sessaoId: "comprador" },
    headers: cabecalhos,
  });

  await iniciarSessaoDoComprador();
  return { sucesso: true, destino: "/comprador" } as EstadoLoginComprador & {
    sucesso?: boolean;
    destino?: string;
  };
}

export async function sair(): Promise<{ sucesso: boolean }> {
  const cabecalhos = await headers();
  try {
    const [filial, comprador] = await Promise.all([
      obterFilialSelecionada(),
      sessaoCompradorAtiva(),
    ]);
    await registrarAuditoria({
      tipoEvento: "logout",
      acao: "logout",
      resultado: "sucesso",
      descricao: comprador
        ? "Logout do comprador"
        : "Logout da sessão de filial",
      contexto: {
        filialId: filial?.id ?? null,
        sessaoId: comprador ? "comprador" : null,
      },
      headers: cabecalhos,
    });
  } catch {}
  await encerrarSessoes();
  return { sucesso: true };
}
