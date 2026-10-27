import { redirect } from "next/navigation";

import { obterFilialSelecionada } from "@/lib/auth/session";

import { FormularioTrocaSenha } from "./formulario";

export default async function TrocarSenhaPage() {
  const loja = await obterFilialSelecionada();

  if (!loja) {
    redirect("/login?erro=filial");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Alterar senha da filial
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {loja.precisaTrocarSenha
            ? "Esta filial ainda usa a credencial inicial provisória. Defina uma nova senha para continuar."
            : "Defina uma nova senha de acesso para esta filial."}
        </p>
        <FormularioTrocaSenha obrigatoria={Boolean(loja.precisaTrocarSenha)} />
      </div>
    </main>
  );
}
