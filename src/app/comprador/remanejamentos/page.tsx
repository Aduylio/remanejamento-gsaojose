"use client";

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { CampoBusca } from "@/components/remanejamentos/campo-busca";
import { TabelaRemanejamentos } from "@/components/remanejamentos/tabela-remanejamentos";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useFiliais } from "@/components/providers/filiais-provider";
import { filtrarRemanejamentos } from "@/lib/data/remanejamentos";
import { FILTROS_STATUS } from "@/lib/status";
import type { LojaId, StatusFiltro } from "@/lib/types";

export default function RemanejamentosDoCompradorPage() {
  const { remanejamentos } = useRemanejamentos();
  const { filiais, getNomeLoja } = useFiliais();
  const [lojaFiltro, setLojaFiltro] = useState<"todas" | LojaId>("todas");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [termo, setTermo] = useState("");

  const filtrados = useMemo(
    () =>
      filtrarRemanejamentos(remanejamentos, {
        lojaId: lojaFiltro === "todas" ? undefined : lojaFiltro,
        status,
        termo,
        nomeLoja: getNomeLoja,
      }),
    [remanejamentos, lojaFiltro, status, termo, getNomeLoja],
  );

  const possuiFiltros =
    lojaFiltro !== "todas" || status !== "todos" || termo.trim().length > 0;

  function limparFiltros() {
    setLojaFiltro("todas");
    setStatus("todos");
    setTermo("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comprador"
        title="Todos os remanejamentos"
        description="Consulte as transferências de todas as lojas, filtre por unidade, status ou produto e abra o detalhe de cada registro."
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

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            A busca considera número, lojas, responsável, produto e EAN.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-2">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="md:col-span-2">
              <Label htmlFor="busca-comprador">Buscar</Label>
              <CampoBusca value={termo} onChange={setTermo} />
            </div>
            <div>
              <Label htmlFor="loja-comprador">Loja</Label>
              <Select
                id="loja-comprador"
                value={lojaFiltro}
                onChange={(evento) =>
                  setLojaFiltro(evento.target.value as "todas" | LojaId)
                }
              >
                <option value="todas">Todas as lojas</option>
                {filiais.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="status-comprador">Status</Label>
              <Select
                id="status-comprador"
                value={status}
                onChange={(evento) =>
                  setStatus(evento.target.value as StatusFiltro)
                }
              >
                {FILTROS_STATUS.map((filtro) => (
                  <option key={filtro.value} value={filtro.value}>
                    {filtro.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={limparFiltros}
                disabled={!possuiFiltros}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          <strong className="font-semibold text-slate-900">
            {filtrados.length}
          </strong>{" "}
          de {remanejamentos.length} remanejamentos encontrados
        </p>
        {possuiFiltros ? (
          <Button variant="link" size="sm" onClick={limparFiltros}>
            Limpar filtros ativos
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          {filtrados.length > 0 ? (
            <TabelaRemanejamentos
              remanejamentos={filtrados}
              basePath="/comprador/remanejamentos"
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum remanejamento encontrado"
              description={
                possuiFiltros
                  ? "Nenhum registro corresponde aos filtros selecionados. Ajuste a busca ou limpe os filtros."
                  : "Ainda não há remanejamentos cadastrados."
              }
              action={
                possuiFiltros ? (
                  <Button variant="secondary" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                ) : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
