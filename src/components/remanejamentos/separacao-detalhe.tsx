"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  MapPin,
  PackageCheck,
  PackageX,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useFilial } from "@/components/providers/filial-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/status-badge";
import { useFiliais } from "@/components/providers/filiais-provider";
import {
  formatarDataHora,
  formatarUnidades,
  progressoDaSeparacao,
  totalDeUnidades,
} from "@/lib/format";
import type { ItemRemanejamento, Remanejamento } from "@/lib/types";
import { cn } from "@/lib/utils";

function ListaDeItens({
  remanejamento,
  interativo,
  onAlternar,
}: {
  remanejamento: Remanejamento;
  interativo: boolean;
  onAlternar?: (itemId: string) => void;
}) {
  const { getNomeLoja } = useFiliais();

  return (
    <>
      {remanejamento.destinos.map((destino) => {
        const totalDestino = destino.itens.reduce(
          (total, itemAtual) => total + itemAtual.quantidade,
          0,
        );

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
                <Badge variant="outline">
                  Destino {remanejamento.destinos.indexOf(destino) + 1} de{" "}
                  {remanejamento.destinos.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <ul className="space-y-2">
                {destino.itens.map((itemAtual) => {
                  const conteudo = (
                    <>
                      <span
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                          itemAtual.separado
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-slate-300 bg-white text-transparent",
                        )}
                        aria-hidden="true"
                      >
                        <Check className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">
                          {itemAtual.nome}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          EAN:{" "}
                          <span className="font-mono">
                            {itemAtual.ean ?? "não informado"}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-slate-700">
                        {formatarUnidades(itemAtual.quantidade)}
                      </span>
                    </>
                  );

                  return (
                    <li key={itemAtual.id}>
                      {interativo && onAlternar ? (
                        <label
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-red-600/30",
                            itemAtual.separado
                              ? "border-emerald-200 bg-emerald-50/60"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={itemAtual.separado}
                            onChange={() => onAlternar(itemAtual.id)}
                            className="sr-only"
                          />
                          {conteudo}
                        </label>
                      ) : (
                        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                          {conteudo}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
}

function itemPendente(
  remanejamento: Remanejamento,
): ItemRemanejamento | undefined {
  for (const destino of remanejamento.destinos) {
    const item = destino.itens.find((itemAtual) => !itemAtual.separado);

    if (item) {
      return item;
    }
  }

  return undefined;
}

export function SeparacaoDetalhe({ id }: { id: string }) {
  const loja = useFilial();
  const { getNomeLoja, listarNomesDeLojas } = useFiliais();
  const {
    remanejamentos,
    iniciarSeparacao,
    alternarItemSeparado,
    concluirSeparacao,
  } = useRemanejamentos();
  const [responsavel, setResponsavel] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [itemProcessando, setItemProcessando] = useState<string | null>(null);

  const remanejamento = remanejamentos.find((item) => item.id === id);

  if (!remanejamento) {
    return (
      <Card>
        <EmptyState
          icon={PackageX}
          title="Remanejamento não encontrado"
          description="O número informado não existe na base de dados."
          action={
            <Link
              href="/painel/separacao"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para a fila
            </Link>
          }
        />
      </Card>
    );
  }

  if (remanejamento.lojaOrigemId !== loja.id) {
    return (
      <Card>
        <EmptyState
          icon={PackageX}
          title="Separação disponível apenas na origem"
          description={`Este remanejamento é separado pela ${getNomeLoja(remanejamento.lojaOrigemId)}. A filial selecionada é ${loja.nome}.`}
          action={
            <Link
              href="/painel/separacao"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para a fila
            </Link>
          }
        />
      </Card>
    );
  }

  const progresso = progressoDaSeparacao(remanejamento);
  const todosSeparados =
    progresso.total > 0 && progresso.separados === progresso.total;
  const nomeValido = responsavel.trim().length >= 3;
  const podeConcluir = todosSeparados && nomeValido;
  const pendente = itemPendente(remanejamento);
  const concluida = remanejamento.status === "separada";
  const remanejamentoId = remanejamento.id;

  async function iniciar() {
    setErro(null);
    setProcessando(true);

    try {
      await iniciarSeparacao(remanejamentoId);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a separação.",
      );
    } finally {
      setProcessando(false);
    }
  }

  async function alternar(itemId: string) {
    if (itemProcessando) {
      return;
    }

    setErro(null);
    setItemProcessando(itemId);

    try {
      await alternarItemSeparado(remanejamentoId, itemId);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o item.",
      );
    } finally {
      setItemProcessando(null);
    }
  }

  async function confirmarConclusao() {
    setErro(null);
    setProcessando(true);

    try {
      await concluirSeparacao(remanejamentoId, responsavel);
      setDialogAberto(false);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a separação.",
      );
      setDialogAberto(false);
    } finally {
      setProcessando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Separação de mercadorias"
        title={remanejamento.numero}
        description={`${getNomeLoja(remanejamento.lojaOrigemId)} separa para ${listarNomesDeLojas(
          remanejamento.destinos.map((destino) => destino.lojaId),
        )}.`}
        actions={
          <>
            <StatusBadge status={remanejamento.status} />
            <Link
              href="/painel/separacao"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Fila de separação
            </Link>
          </>
        }
      />

      {erro ? (
        <Alert variant="danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{erro}</span>
        </Alert>
      ) : null}

      {concluida ? (
        <>
          <Alert variant="success">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong className="font-semibold">Separação concluída.</strong>{" "}
              Todos os itens foram conferidos. Os destinos já podem acompanhar o
              recebimento.
            </span>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Resumo da conclusão</CardTitle>
              <CardDescription>
                Registro da separação finalizada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-2 sm:grid-cols-3 sm:pt-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Responsável
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {remanejamento.responsavelSeparacao ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Concluído em
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formatarDataHora(remanejamento.separadoEm)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Itens e unidades
                </p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {progresso.total} itens ·{" "}
                  {formatarUnidades(totalDeUnidades(remanejamento))}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ListaDeItens remanejamento={remanejamento} interativo={false} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/painel/separacao"
              className={buttonVariants({ variant: "secondary" })}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para a fila
            </Link>
            <Link
              href={`/painel/remanejamentos/${remanejamento.id}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Ver detalhe completo
            </Link>
          </div>
        </>
      ) : (
        <>
          {remanejamento.status === "pendente" ? (
            <Alert variant="info">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <strong className="font-semibold">
                    Separação ainda não iniciada.
                  </strong>{" "}
                  Comece para registrar o horário de início.
                </span>
                <Button
                  size="sm"
                  onClick={iniciar}
                  disabled={processando}
                  className="shrink-0 self-start"
                >
                  {processando ? "Iniciando..." : "Iniciar separação"}
                </Button>
              </div>
            </Alert>
          ) : (
            <Alert variant="info">
              <PackageCheck
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                Separação em andamento desde{" "}
                {formatarDataHora(remanejamento.iniciadoEm)}. Marque cada item
                conferido antes de concluir.
              </span>
            </Alert>
          )}

          <Card>
            <CardContent className="space-y-3 p-5 sm:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Progresso da separação
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {progresso.separados} de {progresso.total} itens marcados como
                    separados
                  </p>
                </div>
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {progresso.percentual}%
                </span>
              </div>
              <Progress value={progresso.percentual} />
              {pendente ? (
                <p className="text-xs text-slate-500">
                  Próximo item pendente:{" "}
                  <span className="font-medium text-slate-700">
                    {pendente.nome}
                  </span>
                  .
                </p>
              ) : (
                <p className="text-xs font-medium text-emerald-700">
                  Todos os itens foram conferidos. Informe o responsável e
                  conclua.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div className="space-y-4">
              <ListaDeItens
                remanejamento={remanejamento}
                interativo
                onAlternar={alternar}
              />

              {remanejamento.observacoes ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Observações do comprador</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 sm:pt-2">
                    <p className="text-sm leading-relaxed text-slate-600">
                      {remanejamento.observacoes}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Concluir separação</CardTitle>
                  <CardDescription>
                    O nome do responsável fica registrado neste remanejamento.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-2 sm:pt-2">
                  <div>
                    <Label htmlFor="responsavel">Nome do responsável</Label>
                    <div className="relative">
                      <UserRound
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                        aria-hidden="true"
                      />
                      <Input
                        id="responsavel"
                        value={responsavel}
                        onChange={(event) =>
                          setResponsavel(event.target.value.slice(0, 80))
                        }
                        placeholder="Ex.: Maria Silva"
                        autoComplete="name"
                        className="pl-9"
                        aria-describedby="responsavel-ajuda"
                      />
                    </div>
                    <p
                      id="responsavel-ajuda"
                      className="mt-1.5 text-xs text-slate-500"
                    >
                      Mínimo de 3 caracteres.
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                    {!todosSeparados
                      ? `Faltam ${progresso.total - progresso.separados} itens para marcar como separados.`
                      : !nomeValido
                        ? "Informe o nome do responsável para liberar a conclusão."
                        : "Tudo pronto para concluir a separação."}
                  </div>

                  <Button
                    className="w-full"
                    disabled={!podeConcluir || processando}
                    onClick={() => {
                      setErro(null);
                      setDialogAberto(true);
                    }}
                  >
                    <PackageCheck className="size-4" aria-hidden="true" />
                    Concluir separação
                  </Button>

                  <p className="text-xs leading-relaxed text-slate-500">
                    A conclusão é definitiva. Os dados ficam registrados no
                    banco de dados.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Linhas de item</dt>
                      <dd className="font-medium text-slate-900">
                        {progresso.total}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Unidades</dt>
                      <dd className="font-medium text-slate-900">
                        {totalDeUnidades(remanejamento)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Destinos</dt>
                      <dd className="font-medium text-slate-900">
                        {remanejamento.destinos.length}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </aside>
          </div>

          <Dialog
            open={dialogAberto}
            onOpenChange={setDialogAberto}
            title="Confirmar conclusão"
            description="Revise as informações antes de finalizar a separação."
          >
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertCircle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  Depois de concluir, os itens não poderão ser desmarcados.
                </span>
              </Alert>

              <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                  <dt className="text-slate-500">Remanejamento</dt>
                  <dd className="font-semibold text-slate-900">
                    {remanejamento.numero}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-200 py-2">
                  <dt className="text-slate-500">Itens conferidos</dt>
                  <dd className="font-medium text-slate-900">
                    {progresso.separados} de {progresso.total}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 pt-2">
                  <dt className="text-slate-500">Responsável</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {responsavel.trim()}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setDialogAberto(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={confirmarConclusao} disabled={processando}>
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {processando ? "Concluindo..." : "Confirmar conclusão"}
                </Button>
              </div>
            </div>
          </Dialog>
        </>
      )}
    </div>
  );
}
