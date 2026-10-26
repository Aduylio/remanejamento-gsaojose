"use client";

import {
  ArrowRight,
  Boxes,
  Clock,
  FileSpreadsheet,
  PackageCheck,
  PackageOpen,
  Plus,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { TabelaRemanejamentos } from "@/components/remanejamentos/tabela-remanejamentos";
import { Alert } from "@/components/ui/alert";
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
import { LOJAS, getNomeLoja } from "@/data/lojas";
import {
  filtrarRemanejamentos,
  ordenarPorData,
} from "@/lib/data/remanejamentos";
import {
  formatarDataHora,
  obterItens,
  resumirPorStatus,
  totalDeUnidades,
} from "@/lib/format";
import { FILTROS_STATUS } from "@/lib/status";
import type { LojaId, StatusFiltro } from "@/lib/types";

export default function CompradorPage() {
  const { remanejamentos } = useRemanejamentos();
  const [lojaFiltro, setLojaFiltro] = useState<"todas" | LojaId>("todas");
  const [statusFiltro, setStatusFiltro] = useState<StatusFiltro>("todos");

  const resumo = resumirPorStatus(remanejamentos);
  const unidades = remanejamentos.reduce(
    (total, item) => total + totalDeUnidades(item),
    0,
  );
  const pendentes = useMemo(
    () =>
      ordenarPorData(
        remanejamentos.filter((item) => item.status === "pendente"),
      ),
    [remanejamentos],
  );
  const maisAntigo = pendentes.length > 0 ? pendentes[pendentes.length - 1] : undefined;
  const emSeparacao = useMemo(
    () =>
      ordenarPorData(
        remanejamentos.filter((item) => item.status === "em_separacao"),
      ),
    [remanejamentos],
  );
  const recentes = useMemo(
    () =>
      filtrarRemanejamentos(remanejamentos, {
        lojaId: lojaFiltro === "todas" ? undefined : lojaFiltro,
        status: statusFiltro,
      }),
    [remanejamentos, lojaFiltro, statusFiltro],
  );

  const possuiFiltros = lojaFiltro !== "todas" || statusFiltro !== "todos";

  function limparFiltros() {
    setLojaFiltro("todas");
    setStatusFiltro("todos");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comprador"
        title="Visão geral da rede"
        description="Acompanhe os remanejamentos das 11 lojas, identifique pendências e crie novas transferências de mercadorias."
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
