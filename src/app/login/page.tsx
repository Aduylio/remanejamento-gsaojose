import { AlertCircle, ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";

import { acessarFilial } from "@/app/login/actions";
import { LoginCompradorDialog } from "@/components/auth/login-comprador-dialog";
import { BrandMark } from "@/components/brand-mark";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { getRotuloLoja, LOJAS } from "@/data/lojas";
import { obterFilialSelecionada, sessaoCompradorAtiva } from "@/lib/auth/session";

const MENSAGENS_ERRO: Record<string, string> = {
  filial: "Selecione uma loja válida para acessar.",
  comprador: "Entre com a senha do comprador para continuar.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string | string[] }>;
}) {
  if (await sessaoCompradorAtiva()) {
    redirect("/comprador");
  }

  if (await obterFilialSelecionada()) {
    redirect("/painel");
  }

  const parametros = await searchParams;
  const codigoErro =
    typeof parametros.erro === "string" ? parametros.erro : undefined;
  const mensagemErro = codigoErro ? MENSAGENS_ERRO[codigoErro] : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandMark />

        <h1 className="mt-8 text-xl font-semibold tracking-tight text-slate-900">
          Remanejamento — Grupo São José
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Selecione a loja para abrir o painel.
        </p>

        {mensagemErro ? (
          <Alert variant="danger" className="mt-5">
            <AlertCircle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>{mensagemErro}</span>
          </Alert>
        ) : null}

        <form action={acessarFilial} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="lojaId">Loja</Label>
            <Select id="lojaId" name="lojaId" defaultValue="" required>
              <option value="" disabled>
                Selecione a loja
              </option>
              {LOJAS.map((loja) => (
                <option key={loja.id} value={loja.id}>
                  {getRotuloLoja(loja.id)}
                </option>
              ))}
            </Select>
          </div>

          <SubmitButton className="w-full" pendingLabel="Entrando...">
            <ArrowRight className="size-4" aria-hidden="true" />
            Entrar
          </SubmitButton>
        </form>

        <div className="my-7 h-px bg-slate-200" aria-hidden="true" />

        <LoginCompradorDialog variant="secondary" />

        <p className="mt-8 text-center text-xs text-slate-400">
          Ambiente de demonstração. Nenhum dado é real ou permanente.
        </p>
      </div>
    </main>
  );
}
