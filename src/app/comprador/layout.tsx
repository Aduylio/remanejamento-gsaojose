import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { CompradorShell } from "@/components/layout/comprador-shell";
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

  return <CompradorShell>{children}</CompradorShell>;
}
