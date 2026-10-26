"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  PackageCheck,
  PackageOpen,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useFilial } from "@/components/providers/filial-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { TabelaRemanejamentos } from "@/components/remanejamentos/tabela-remanejamentos";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getNomeLoja } from "@/data/lojas";
import {
  filtrarRemanejamentos,
  ordenarPorData,
} from "@/lib/data/remanejamentos";
import {
  formatarData,
  formatarDataHora,
  obterItens,
  resumirPorStatus,
  totalDeUnidades,
} from "@/lib/format";
import { FILTROS_STATUS } from "@/lib/status";
import type { StatusFiltro } from "@/lib/types";

export default function PainelPage() {
  const loja = useFilial();
  const { remanejamentos } = useRemanejamentos();
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

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
  const emAberto = useMemo(
    () => ordenarPorData(comoOrigem.filter((item) => item.status !== "separada")),
    [comoOrigem],
  );
  const maisAntigo = emAberto.length > 0 ? emAberto[emAberto.length - 1] : undefined;
  const recentes = useMemo(
    () =>
      filtrarRemanejamentos(daFilial, {
        status: statusFiltro,
      }),
    [daFilial, statusFiltro],
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
