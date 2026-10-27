import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CompradorShell } from "@/components/layout/comprador-shell";
import { listarFiliais } from "@/lib/db/filiais";
import { listarRemanejamentos } from "@/lib/db/remanejamentos";
import {
  obterFilialSelecionada,
  sessaoCompradorAtiva,
} from "@/lib/auth/session";

export default async function CompradorLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await sessaoCompradorAtiva())) {
    if (await obterFilialSelecionada()) {
      redirect("/painel");
    }

    redirect("/login?erro=comprador");
  }

  const [filiais, remanejamentos] = await Promise.all([
    listarFiliais(),
    listarRemanejamentos(),
  ]);

  return (
    <CompradorShell
      filiais={filiais}
      remanejamentosIniciais={remanejamentos}
    >
      {children}
    </CompradorShell>
  );
}
