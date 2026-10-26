"use client";

import { FlaskConical, RotateCcw } from "lucide-react";

import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Button } from "@/components/ui/button";

export function DemoBanner() {
  const { restaurarDemonstracao } = useRemanejamentos();

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-2.5 text-xs leading-relaxed text-amber-900 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="flex items-start gap-2 sm:items-center">
          <FlaskConical
            className="mt-0.5 size-4 shrink-0 sm:mt-0"
            aria-hidden="true"
          />
          <span>
            <strong className="font-semibold">Ambiente de demonstração.</strong>{" "}
            As alterações existem apenas nesta sessão e não são salvas no banco.
          </span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={restaurarDemonstracao}
          className="h-7 shrink-0 self-start px-2 text-amber-900 hover:bg-amber-100 hover:text-amber-950 sm:self-auto"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Restaurar dados
        </Button>
      </div>
    </div>
  );
}
