"use client";

import { ClipboardList, Filter } from "lucide-react";
import { useMemo, useState } from "react";

import { useFilial } from "@/components/providers/filial-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { CampoBusca } from "@/components/remanejamentos/campo-busca";
import { TabelaRemanejamentos } from "@/components/remanejamentos/tabela-remanejamentos";
import { Button } from "@/components/ui/button";
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
import { filtrarRemanejamentos } from "@/lib/data/remanejamentos";
import { FILTROS_STATUS } from "@/lib/status";
import type { RelacaoFiltro, StatusFiltro } from "@/lib/types";

const FILTROS_RELACAO: ReadonlyArray<{
  value: RelacaoFiltro;
  label: string;
}> = [
  { value: "todas", label: "Todas as movimentações da filial" },
  { value: "separar", label: "Que esta filial separa" },
  { value: "receber", label: "Que esta filial recebe" },
];

export default function RemanejamentosDaLojaPage() {
  const loja = useFilial();
  const { remanejamentos } = useRemanejamentos();
  const [relacao, setRelacao] = useState<RelacaoFiltro>("todas");
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [termo, setTermo] = useState("");

  const daFilial = useMemo(
    () => filtrarRemanejamentos(remanejamentos, { lojaId: loja.id }),
    [remanejamentos, loja.id],
  );

  const filtrados = useMemo(
    () =>
      filtrarRemanejamentos(remanejamentos, {
        lojaId: loja.id,
        relacao,
        status,
        termo,
      }),
    [remanejamentos, loja.id, relacao, status, termo],
  );

  const possuiFiltros =
    relacao !== "todas" || status !== "todos" || termo.trim().length > 0;

  function limparFiltros() {
    setRelacao("todas");
    setStatus("todos");
    setTermo("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={loja.nome}
        title="Remanejamentos"
        description="Consulte todas as transferências em que a filial é origem ou destino, com filtros por relação, status e busca."
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-500" aria-hidden="true" />
            <CardTitle>Filtros</CardTitle>
          </div>
          <CardDescription>
            Combine os filtros para localizar um remanejamento específico.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-2">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="md:col-span-2 xl:col-span-1">
              <Label htmlFor="busca-filial">Buscar</Label>
              <CampoBusca value={termo} onChange={setTermo} />
            </div>
            <div>
              <Label htmlFor="relacao">Relação com a filial</Label>
              <Select
                id="relacao"
                value={relacao}
                onChange={(evento) =>
                  setRelacao(evento.target.value as RelacaoFiltro)
                }
              >
                {FILTROS_RELACAO.map((filtro) => (
                  <option key={filtro.value} value={filtro.value}>
                    {filtro.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filial">Status</Label>
              <Select
                id="status-filial"
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
          de {daFilial.length} movimentações encontradas
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
              basePath="/painel/remanejamentos"
              lojaId={loja.id}
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Nenhum remanejamento encontrado"
              description={
                possuiFiltros
                  ? "Nenhum registro desta filial corresponde aos filtros selecionados."
                  : "Esta filial ainda não possui movimentações na base de demonstração."
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
