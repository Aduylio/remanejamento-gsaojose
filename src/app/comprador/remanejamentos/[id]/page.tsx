import { DetalheRemanejamento } from "@/components/remanejamentos/detalhe-remanejamento";

export default async function DetalheRemanejamentoDoCompradorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DetalheRemanejamento id={id} />;
}
