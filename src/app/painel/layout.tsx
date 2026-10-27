import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { FilialShell } from "@/components/layout/filial-shell";
import { listarFiliais } from "@/lib/db/filiais";
import { listarRemanejamentos } from "@/lib/db/remanejamentos";
import {
  obterFilialSelecionada,
  sessaoCompradorAtiva,
} from "@/lib/auth/session";

export default async function PainelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [loja, filiais, remanejamentos] = await Promise.all([
    obterFilialSelecionada(),
    listarFiliais(),
    listarRemanejamentos(),
  ]);

  if (!loja) {
    if (await sessaoCompradorAtiva()) {
      redirect("/comprador");
    }

    redirect("/login?erro=filial");
  }

  return (
    <FilialShell
      loja={loja}
      filiais={filiais}
      remanejamentosIniciais={remanejamentos}
    >
      {children}
    </FilialShell>
  );
}
