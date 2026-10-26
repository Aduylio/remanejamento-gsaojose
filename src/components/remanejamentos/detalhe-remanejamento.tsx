"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ClipboardList,
  Clock,
  MapPin,
  PackageCheck,
  PackageX,
  Store,
} from "lucide-react";
import Link from "next/link";

import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Alert } from "@/components/ui/alert";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { getNomeLoja, listarNomesDeLojas } from "@/data/lojas";
import {
  formatarDataHora,
  formatarUnidades,
  obterItens,
  totalDeLinhas,
  totalDeUnidades,
} from "@/lib/format";
import { STATUS_SEPARACAO } from "@/lib/status";
import type { LojaId } from "@/lib/types";
import { cn } from "@/lib/utils";

function LinhaResumo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0 last:pb-0">
      <dt className="text-sm text-slate-500">{rotulo}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">
        {children}
      </dd>
    </div>
  );
}

function conteudoIndisponivel(
  titulo: string,
  descricao: string,
  voltarHref: string,
  voltarLabel: string,
) {
  return (
    <Card>
      <EmptyState
        icon={PackageX}
        title={titulo}
        description={descricao}
        action={
          <Link
            href={voltarHref}
            className={buttonVariants({ variant: "secondary" })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {voltarLabel}
          </Link>
        }
      />
    </Card>
  );
}

export function DetalheRemanejamento({
  id,
  lojaId,
}: {
  id: string;
  lojaId?: LojaId;
}) {
  const { remanejamentos } = useRemanejamentos();
  const remanejamento = remanejamentos.find((item) => item.id === id);
  const voltarHref = lojaId
    ? "/painel/remanejamentos"
    : "/comprador/remanejamentos";
  const voltarLabel = lojaId ? "Voltar para a filial" : "Voltar para a lista";

  if (!remanejamento) {
    return conteudoIndisponivel(
      "Remanejamento não encontrado",
      "O número informado não existe na base de demonstração. Ele pode ter sido restaurado ou nunca ter sido criado.",
      voltarHref,
      voltarLabel,
    );
  }

  const relacionado =
    !lojaId ||
    remanejamento.lojaOrigemId === lojaId ||
    remanejamento.destinos.some((destino) => destino.lojaId === lojaId);

  if (!relacionado) {
    return conteudoIndisponivel(
      "Remanejamento de outra filial",
      "Esta movimentação não envolve a filial selecionada. Troque de filial para consultar outros registros.",
      voltarHref,
      voltarLabel,
    );
  }

  const ehOrigem = Boolean(lojaId && remanejamento.lojaOrigemId === lojaId);
  const ehDestino = Boolean(
    lojaId &&
      remanejamento.destinos.some((destino) => destino.lojaId === lojaId),
  );
  const podeSeparar = ehOrigem && remanejamento.status !== "separada";
  const itens = obterItens(remanejamento);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detalhe do remanejamento"
        title={remanejamento.numero}
        description={`Criado em ${formatarDataHora(remanejamento.criadoEm)}. Consulte lojas, produtos, quantidades e o andamento da separação.`}
        actions={
          <>
            <StatusBadge status={remanejamento.status} />
            <Link
              href={voltarHref}
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {voltarLabel}
            </Link>
            {podeSeparar ? (
              <Link
                href={`/painel/separacao/${remanejamento.id}`}
                className={buttonVariants()}
              >
                <PackageCheck className="size-4" aria-hidden="true" />
                Abrir separação
              </Link>
            ) : null}
          </>
        }
      />

      {lojaId ? (
        podeSeparar ? (
          <Alert variant="info">
            <PackageCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Esta filial é a <strong className="font-semibold">origem</strong>{" "}
              e precisa separar os itens antes da entrega aos destinos.
            </span>
          </Alert>
        ) : ehDestino && remanejamento.status !== "separada" ? (
          <Alert variant="warning">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Esta filial é <strong className="font-semibold">destino</strong>.
              Os itens ainda estão em separação na loja de origem.
            </span>
          </Alert>
        ) : ehDestino ? (
          <Alert variant="success">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Separação concluída. Os itens destinados a esta filial estão
              prontos para recebimento.
            </span>
          </Alert>
        ) : null
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="space-y-4">
          {remanejamento.destinos.map((destino) => {
            const totalDestino = destino.itens.reduce(
              (total, itemAtual) => total + itemAtual.quantidade,
              0,
            );
            const separados = destino.itens.filter(
              (itemAtual) => itemAtual.separado,
            ).length;

            return (
              <Card key={destino.lojaId}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                        <MapPin className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle>{getNomeLoja(destino.lojaId)}</CardTitle>
                        <CardDescription>
                          {destino.itens.length} itens ·{" "}
                          {formatarUnidades(totalDestino)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {lojaId === destino.lojaId ? (
                        <Badge variant="blue">Sua filial recebe</Badge>
                      ) : null}
                      <Badge variant="outline">
                        {separados} de {destino.itens.length} separados
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2 sm:pt-2">
                  <ul className="divide-y divide-slate-100">
                    {destino.itens.map((itemAtual) => (
                      <li
                        key={itemAtual.id}
                        className="flex flex-col gap-2 py-3 first:pt-1 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {itemAtual.nome}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            EAN:{" "}
                            <span className="font-mono">
                              {itemAtual.ean ?? "não informado"}
                            </span>
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatarUnidades(itemAtual.quantidade)}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              itemAtual.separado
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600",
                            )}
                          >
                            {itemAtual.separado ? (
                              <Check className="size-3" aria-hidden="true" />
                            ) : null}
                            {itemAtual.separado ? "Separado" : "Pendente"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}

          {remanejamento.observacoes ? (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 sm:pt-2">
                <p className="text-sm leading-relaxed text-slate-600">
                  {remanejamento.observacoes}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>
                {STATUS_SEPARACAO[remanejamento.status].descricao}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <dl>
                <LinhaResumo rotulo="Origem">
                  {getNomeLoja(remanejamento.lojaOrigemId)}
                </LinhaResumo>
                <LinhaResumo rotulo="Destinos">
                  {listarNomesDeLojas(
                    remanejamento.destinos.map((destino) => destino.lojaId),
                  )}
                </LinhaResumo>
                <LinhaResumo rotulo="Linhas de item">
                  {totalDeLinhas(remanejamento)}
                </LinhaResumo>
                <LinhaResumo rotulo="Unidades">
                  {formatarUnidades(totalDeUnidades(remanejamento))}
                </LinhaResumo>
                <LinhaResumo rotulo="Responsável">
                  {remanejamento.responsavelSeparacao ?? "Ainda não definido"}
                </LinhaResumo>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">Criado</p>
                    <p className="text-xs text-slate-500">
                      {formatarDataHora(remanejamento.criadoEm)}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-sky-600">
                    <Clock className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Separação iniciada
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatarDataHora(remanejamento.iniciadoEm)}
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Concluído
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatarDataHora(remanejamento.separadoEm)}
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {lojaId ? null : (
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <Store className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-slate-500">
                  Visão do comprador: acompanhamento de toda a rede. A alteração
                  de itens é feita somente pela filial de origem.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="flex items-start gap-3 p-5">
              <ClipboardList
                className="mt-0.5 size-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              <div className="text-xs leading-relaxed text-slate-500">
                <p className="font-medium text-slate-700">Dados fictícios</p>
                <p className="mt-1">{itens.length} linhas de item nesta demonstração. Nada é salvo permanentemente.</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
