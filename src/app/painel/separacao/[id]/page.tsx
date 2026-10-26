import { SeparacaoDetalhe } from "@/components/remanejamentos/separacao-detalhe";

export default async function SeparacaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SeparacaoDetalhe id={id} />;
}
