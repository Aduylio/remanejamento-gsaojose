import { redirect } from "next/navigation";

import { obterFilialSelecionada, sessaoCompradorAtiva } from "@/lib/auth/session";

export default async function Home() {
  if (await sessaoCompradorAtiva()) {
    redirect("/comprador");
  }

  if (await obterFilialSelecionada()) {
    redirect("/painel");
  }

  redirect("/login");
}
