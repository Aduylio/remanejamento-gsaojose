"use client";

import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";

import { acessarFilial, type EstadoLoginFilial } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { criarCatalogoFiliais } from "@/lib/filiais";
import type { Loja } from "@/lib/types";

const ESTADO_INICIAL: EstadoLoginFilial = {};

export function LoginFilialDialog({ filiais }: { filiais: Loja[] }) {
  const [aberto, setAberto] = useState(false);
  const [lojaSelecionada, setLojaSelecionada] = useState("");
  const { getRotuloLoja } = criarCatalogoFiliais(filiais);
  const [estado, acao] = useActionState(acessarFilial, ESTADO_INICIAL);

  return (
    <>
      <div className="space-y-3">
        <div>
          <Label htmlFor="lojaIdLista">Filial</Label>
          <Select
            id="lojaIdLista"
            value={lojaSelecionada}
            onChange={(evento) => setLojaSelecionada(evento.target.value)}
          >
            <option value="" disabled>
              Selecione a filial
            </option>
            {filiais.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {getRotuloLoja(loja.id)}
              </option>
            ))}
          </Select>
        </div>
        <Button
          className="w-full"
          disabled={!lojaSelecionada}
          onClick={() => setAberto(true)}
        >
          <ArrowRight className="size-4" aria-hidden="true" />
          Acessar com senha
        </Button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto} title="Acesso por filial">
        <form action={acao} className="mt-4 space-y-4">
          <input type="hidden" name="lojaId" value={lojaSelecionada} />
          <div>
            <Label htmlFor="senhaFilial">Senha da filial</Label>
            <Input
              id="senhaFilial"
              name="senha"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {estado?.erro ? (
            <p className="text-sm text-red-600">{estado.erro}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAberto(false)}
            >
              Cancelar
            </Button>
            <SubmitButton pendingLabel="Validando...">Entrar</SubmitButton>
          </div>
        </form>
      </Dialog>
    </>
  );
}
