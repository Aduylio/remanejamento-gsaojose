import { AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";
import Image from "next/image";

import { LoginFilialDialog } from "@/components/auth/login-filial-dialog";
import { LoginCompradorDialog } from "@/components/auth/login-comprador-dialog";
import { Alert } from "@/components/ui/alert";
import { listarFiliais } from "@/lib/db/filiais";
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

  const [parametros, filiais] = await Promise.all([
    searchParams,
    listarFiliais(),
  ]);
  const codigoErro =
    typeof parametros.erro === "string" ? parametros.erro : undefined;
  const mensagemErro = codigoErro ? MENSAGENS_ERRO[codigoErro] : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-[55%_45%]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[var(--color-navy-900)] via-[var(--color-navy-900)] to-[var(--color-navy-800)] px-10 py-12 lg:flex xl:px-16">
        <div className="absolute -right-40 top-10 h-80 w-80 rounded-full bg-[var(--color-red-600)]/10 blur-3xl" />
        <div className="absolute -bottom-48 left-10 h-96 w-96 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex items-center gap-4">
          <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-white/10 p-2 backdrop-blur">
            <Image
              src="/Logo.socfarm.png"
              alt="Socfarm"
              fill
              sizes="48px"
              className="object-contain p-1"
            />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/60">
              Grupo São José
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              Rede integrada de farmácias
            </p>
          </div>
        </div>

        <div className="relative max-w-xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-4xl font-bold tracking-tight text-white xl:text-5xl">
              Remanejamento entre filiais
            </h2>
            <p className="text-lg text-white/80">
              Juntos por uma saúde ainda melhor.
            </p>
            <p className="max-w-lg text-base leading-relaxed text-white/70">
              Centralize transferências, acompanhe a separação e mantenha o
              fluxo de mercadorias organizado com mais agilidade e segurança.
            </p>
          </div>

          <div className="flex flex-nowrap items-center justify-start gap-2 rounded-2xl bg-white/5 px-4 py-3 backdrop-blur sm:gap-3 lg:gap-3">
            <div className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[var(--shadow-sm)] sm:h-14 sm:px-4">
              <div className="relative h-8 w-[90px] sm:h-9 sm:w-[110px]">
                <Image
                  src="/Logo.socfarm.png"
                  alt="Socfarm"
                  fill
                  sizes="110px"
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[var(--shadow-sm)] sm:h-14 sm:px-4">
              <div className="relative h-8 w-[110px] sm:h-9 sm:w-[128px]">
                <Image
                  src="/Logo.Original.png"
                  alt="Farmácia Original"
                  fill
                  sizes="128px"
                  className="object-contain"
                />
              </div>
            </div>
            <div className="flex h-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white px-3 py-1.5 shadow-[var(--shadow-sm)] sm:h-14 sm:px-4">
              <div className="relative h-8 w-[130px] sm:h-9 sm:w-[148px]">
                <Image
                  src="/Logo.atacadao.v2.png"
                  alt="Atacadão dos Medicamentos"
                  fill
                  sizes="148px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        <p className="relative text-sm text-white/50">
          Sistema interno • Uso restrito às unidades autorizadas
        </p>
      </section>

      <section className="flex items-center justify-center bg-[var(--color-bg)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-[520px] space-y-8">
          <div className="space-y-3 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-[var(--color-text-tertiary)]">
              Grupo São José
            </p>
            <h1 className="text-[34px] font-bold tracking-tight text-[var(--color-navy-900)] sm:text-[36px]">
              Remanejamento
            </h1>
            <p className="text-base text-[var(--color-text-secondary)]">
              Acesse com suas credenciais para continuar
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-lg)] sm:p-10">
            <div className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-[var(--color-navy-900)]">
                  Acesso ao sistema
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Selecione a loja ou acesse como comprador
                </p>
              </div>

              {mensagemErro ? (
                <Alert variant="danger">
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{mensagemErro}</span>
                </Alert>
              ) : null}

              <div className="space-y-4">
                <LoginFilialDialog filiais={filiais} />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--color-divider)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-[0.3em] text-[var(--color-text-tertiary)]">
                  <span className="bg-white px-3">ou</span>
                </div>
              </div>

              <LoginCompradorDialog variant="secondary" />
            </div>
          </div>

          <p className="text-center text-xs text-[var(--color-text-tertiary)]">
            Sistema interno de remanejamento entre filiais • Grupo São José
          </p>
        </div>
      </section>
    </main>
  );
}
