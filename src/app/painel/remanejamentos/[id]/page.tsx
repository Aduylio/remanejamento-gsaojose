import { redirect } from "next/navigation";

import { DetalheRemanejamento } from "@/components/remanejamentos/detalhe-remanejamento";
import { obterFilialSelecionada } from "@/lib/auth/session";

export default async function DetalheRemanejamentoDaLojaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, loja] = await Promise.all([
    params,
    obterFilialSelecionada(),
  ]);

  if (!loja) {
    redirect("/login?erro=filial");
  }

  return <DetalheRemanejamento id={id} lojaId={loja.id} />;
}
