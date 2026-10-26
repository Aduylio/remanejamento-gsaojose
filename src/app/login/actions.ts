"use server";

import { redirect } from "next/navigation";

import { isLojaId } from "@/data/lojas";
import { verificarSenhaComprador } from "@/lib/auth/password";
import {
  encerrarSessoes,
  iniciarSessaoDaLoja,
  iniciarSessaoDoComprador,
} from "@/lib/auth/session";

export interface EstadoLoginComprador {
  erro?: string;
}

export async function acessarFilial(formData: FormData): Promise<void> {
  const lojaId = String(formData.get("lojaId") ?? "");

  if (!isLojaId(lojaId)) {
    redirect("/login?erro=filial");
  }

  await iniciarSessaoDaLoja(lojaId);
  redirect("/painel");
}

export async function entrarComoComprador(
  _estadoAnterior: EstadoLoginComprador,
  formData: FormData,
): Promise<EstadoLoginComprador> {
  const senha = String(formData.get("senha") ?? "");

  if (!senha.trim()) {
    return { erro: "Informe a senha de demonstração." };
  }

  if (senha.length > 200 || !verificarSenhaComprador(senha)) {
    return { erro: "Senha incorreta. Verifique a senha de demonstração." };
  }

  await iniciarSessaoDoComprador();
  redirect("/comprador");
}

export async function sair(): Promise<void> {
  await encerrarSessoes();
  redirect("/login");
}
