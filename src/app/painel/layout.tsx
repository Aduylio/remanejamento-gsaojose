import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { FilialShell } from "@/components/layout/filial-shell";
import {
  obterFilialSelecionada,
  sessaoCompradorAtiva,
} from "@/lib/auth/session";

export default async function PainelLayout({
  children,
}: {
  children: ReactNode;
}) {
  const loja = await obterFilialSelecionada();

  if (!loja) {
    if (await sessaoCompradorAtiva()) {
      redirect("/comprador");
    }

    redirect("/login?erro=filial");
  }

  return <FilialShell loja={loja}>{children}</FilialShell>;
}
