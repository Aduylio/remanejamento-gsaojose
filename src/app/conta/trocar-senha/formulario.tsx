"use client";

import { useActionState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

import { trocarSenhaFilial, type EstadoTrocaSenha } from "./actions";

const ESTADO_INICIAL: EstadoTrocaSenha = {};

export function FormularioTrocaSenha({
  obrigatoria,
}: {
  obrigatoria: boolean;
}) {
  const [estado, acao] = useActionState(trocarSenhaFilial, ESTADO_INICIAL);

  return (
    <form action={acao} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="senhaAtual">Senha atual</Label>
        <Input
          id="senhaAtual"
          name="senhaAtual"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="novaSenha">Nova senha</Label>
        <Input
          id="novaSenha"
          name="novaSenha"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
        <p className="mt-1 text-xs text-slate-500">
          Mínimo de 10 caracteres. Não reutilize a senha inicial.
        </p>
      </div>
      <div>
        <Label htmlFor="confirmacao">Confirmar nova senha</Label>
        <Input
          id="confirmacao"
          name="confirmacao"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
        />
      </div>
      {estado?.erro ? (
        <p className="text-sm text-red-600">{estado.erro}</p>
      ) : null}
      <SubmitButton className="w-full" pendingLabel="Salvando...">
        Salvar nova senha
      </SubmitButton>
      {!obrigatoria ? (
        <Link
          href="/painel"
          className={`${buttonVariants({ variant: "outline" })} w-full`}
        >
          Voltar ao painel
        </Link>
      ) : null}
    </form>
  );
}
