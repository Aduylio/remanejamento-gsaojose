"use client";

import { Boxes, Clock, PackageCheck, PackageOpen, Plus } from "lucide-react";
import Link from "next/link";

import { useFiliais } from "@/components/providers/filiais-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { resumirPorStatus, totalDeUnidades } from "@/lib/format";

export default function CompradorPage() {
  const { remanejamentos } = useRemanejamentos();
  const { filiais } = useFiliais();

  const resumo = resumirPorStatus(remanejamentos);
  const unidades = remanejamentos.reduce(
    (total, item) => total + totalDeUnidades(item),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comprador"
        title="Visão geral da rede"
        description={`Acompanhe os remanejamentos das ${filiais.length} lojas, identifique pendências e crie novas transferências de mercadorias.`}
        actions={
          <Link
            href="/comprador/remanejamentos/novo"
            className={buttonVariants()}
          >
            <Plus className="size-4" aria-hidden="true" />
            Novo remanejamento
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pendentes"
          value={resumo.pendente}
          description="Aguardando início da separação."
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Em separação"
          value={resumo.em_separacao}
          description="Em separação."
          icon={PackageOpen}
          tone="blue"
        />
        <StatCard
          label="Separadas"
          value={resumo.separada}
          description="Separadas."
          icon={PackageCheck}
          tone="green"
        />
        <StatCard
          label="Unidades"
          value={unidades}
          description="Volume total."
          icon={Boxes}
        />
      </div>
    </div>
  );
}
