"use client";

import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";

import { entrarComoComprador } from "@/app/login/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginCompradorDialog({
  variant = "default",
}: {
  variant?: "default" | "secondary";
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <Button
        className="w-full h-11 rounded-[9px] border border-[var(--color-border-strong)] bg-white text-[var(--color-navy-900)] hover:bg-[var(--color-blue-50)]"
        variant={variant}
        onClick={() => setAberto(true)}
      >
        <LogIn className="size-4" aria-hidden="true" />
        Login comprador
      </Button>

      <Dialog
        open={aberto}
        onOpenChange={setAberto}
        title="Login comprador"
        description="Acesse o painel para cadastrar remanejamentos e acompanhar as separações."
      >
        {aberto ? (
          <FormularioLoginComprador onCancelar={() => setAberto(false)} />
        ) : null}
      </Dialog>
    </>
  );
}

function FormularioLoginComprador({
  onCancelar,
}: {
  onCancelar: () => void;
}) {
  const router = useRouter();
  const idSenha = useId();
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [estado, formAction] = useActionState(entrarComoComprador, {});

  useEffect(() => {
    if (estado?.sucesso && estado.destino) {
      onCancelar();
      router.push(estado.destino);
      router.refresh();
    }
  }, [estado, onCancelar, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor={idSenha}>Senha de acesso</Label>
        <div className="relative">
          <Input
            id={idSenha}
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            maxLength={200}
            placeholder="Digite a senha"
            aria-invalid={Boolean(estado.erro)}
            aria-describedby={estado.erro ? `${idSenha}-erro` : undefined}
            className="pr-11"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setMostrarSenha((valor) => !valor)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            {mostrarSenha ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {estado.erro ? (
        <Alert variant="danger" id={`${idSenha}-erro`}>
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{estado.erro}</span>
        </Alert>
      ) : null}

      <Alert variant="warning">
        <span>
          <strong className="font-semibold">Acesso restrito.</strong> A
          senha é validada no servidor, mas este fluxo não substitui uma
          autenticação de produção. Consulte o README do projeto para a senha
          de acesso configurada.
        </span>
      </Alert>

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <SubmitButton pendingLabel="Entrando...">
          <LogIn className="size-4" aria-hidden="true" />
          Entrar
        </SubmitButton>
      </div>
    </form>
  );
}
