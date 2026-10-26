"use client";

import {
  ArrowRight,
  Clock,
  ListChecks,
  MapPin,
  PackageCheck,
  PackageOpen,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { useFilial } from "@/components/providers/filial-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { getNomeLoja } from "@/data/lojas";
import { tarefasDeSeparacaoDaLoja } from "@/lib/data/remanejamentos";
import {
  formatarDataHora,
  formatarUnidades,
  obterItens,
  progressoDaSeparacao,
  totalDeUnidades,
} from "@/lib/format";

export default function SeparacaoPage() {
  const loja = useFilial();
  const { remanejamentos } = useRemanejamentos();

  const tarefas = useMemo(
    () =>
      tarefasDeSeparacaoDaLoja(remanejamentos, loja.id).sort(
        (a, b) =>
          new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime(),
      ),
    [remanejamentos, loja.id],
  );

  const pendentes = tarefas.filter((item) => item.status === "pendente").length;
  const emSeparacao = tarefas.filter(
    (item) => item.status === "em_separacao",
  ).length;
  const itensPendentes = tarefas.reduce((total, item) => {
    const progresso = progressoDaSeparacao(item);
    return total + (progresso.total - progresso.separados);
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={loja.nome} title="Fila de separação" description="" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Aguardando início"
          value={pendentes}
          description="Tarefas pendentes."
          icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Em andamento"
          value={emSeparacao}
          description="Separações em andamento."
          icon={PackageOpen}
          tone="blue"
        />
        <StatCard
          label="Itens pendentes"
          value={itensPendentes}
          description="Itens a conferir."
          icon={ListChecks}
        />
      </div>

      {tarefas.length === 0 ? (
        <Card>
          <EmptyState
            icon={PackageCheck}
            title="Fila em dia"
            description="Não há remanejamentos aguardando separação nesta filial."
            action={
              <Link
                href="/painel/remanejamentos"
                className={buttonVariants({ variant: "secondary" })}
              >
                Consultar movimentações
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>
              {tarefas.length}{" "}
              {tarefas.length === 1 ? "tarefa" : "tarefas"}
            </span>
          </div>

          <ul className="grid gap-4 xl:grid-cols-2">
            {tarefas.map((tarefa) => {
              const progresso = progressoDaSeparacao(tarefa);
              const itens = obterItens(tarefa);

              return (
                <li key={tarefa.id}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle>{tarefa.numero}</CardTitle>
                          <CardDescription>
                            Criado em {formatarDataHora(tarefa.criadoEm)}
                          </CardDescription>
                        </div>
                        <StatusBadge status={tarefa.status} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-2 sm:pt-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Entregar em
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tarefa.destinos.map((destino) => (
                            <Badge key={destino.lojaId} variant="blue">
                              <MapPin className="size-3" aria-hidden="true" />
                              {getNomeLoja(destino.lojaId)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
                        <div>
                          <p className="text-base font-bold text-slate-900">
                            {tarefa.destinos.length}
                          </p>
                          <p className="text-[11px] text-slate-500">destinos</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">
                            {itens.length}
                          </p>
                          <p className="text-[11px] text-slate-500">itens</p>
                        </div>
                        <div>
                          <p className="text-base font-bold text-slate-900">
                            {totalDeUnidades(tarefa)}
                          </p>
                          <p className="text-[11px] text-slate-500">unidades</p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                          <span>
                            {progresso.separados} de {progresso.total} itens
                            conferidos
                          </span>
                          <span className="font-semibold text-slate-700">
                            {progresso.percentual}%
                          </span>
                        </div>
                        <Progress value={progresso.percentual} />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500">
                          {formatarUnidades(totalDeUnidades(tarefa))} no total
                        </span>
                        <Link
                          href={`/painel/separacao/${tarefa.id}`}
                          className={buttonVariants({ size: "sm" })}
                        >
                          {tarefa.status === "pendente"
                            ? "Iniciar separação"
                            : "Continuar separação"}
                          <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
