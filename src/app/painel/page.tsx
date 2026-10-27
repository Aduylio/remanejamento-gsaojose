"use client";

import { Clock, PackageCheck, PackageOpen, Truck } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useFilial } from "@/components/providers/filial-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { filtrarRemanejamentos } from "@/lib/data/remanejamentos";
import { resumirPorStatus } from "@/lib/format";

export default function PainelPage() {
  const loja = useFilial();
  const { remanejamentos } = useRemanejamentos();

  const daFilial = useMemo(
    () => filtrarRemanejamentos(remanejamentos, { lojaId: loja.id }),
    [remanejamentos, loja.id],
  );

  const comoOrigem = useMemo(
    () => daFilial.filter((item) => item.lojaOrigemId === loja.id),
    [daFilial, loja.id],
  );

  const resumo = resumirPorStatus(comoOrigem);
  const aReceber = useMemo(
    () =>
      daFilial.filter(
        (item) =>
          item.lojaOrigemId !== loja.id && item.status !== "separada",
      ),
    [daFilial, loja.id],
  );
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={loja.nome}
        title="Visão geral da filial"
        description="Acompanhe o que esta loja precisa separar, o que está em andamento e os recebimentos previstos."
        actions={
          <Link
            href="/painel/separacao"
            className={buttonVariants({ variant: "outline" })}
          >
            <PackageCheck className="size-4" aria-hidden="true" />
            Ir para separação
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendente"
          value={resumo.pendente}
          description="Aguardando início da separação."
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Em separação"
          value={resumo.em_separacao}
          description="Separação iniciada, mas não concluída."
          icon={PackageOpen}
          tone="blue"
        />
        <StatCard
          label="A receber"
          value={aReceber.length}
          description="Aguardando recebimento."
          icon={Truck}
        />
      </div>
    </div>
  );
}
