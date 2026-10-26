"use client";

import { ArrowUpRight, Boxes } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { getNomeLoja } from "@/data/lojas";
import { formatarData, totalDeLinhas, totalDeUnidades } from "@/lib/format";
import type { LojaId, Remanejamento } from "@/lib/types";

function PapelDaLoja({
  remanejamento,
  lojaId,
}: {
  remanejamento: Remanejamento;
  lojaId?: LojaId;
}) {
  if (!lojaId) {
    return null;
  }

  if (remanejamento.lojaOrigemId === lojaId) {
    return <Badge variant="red">Separa nesta filial</Badge>;
  }

  if (
    remanejamento.destinos.some((destino) => destino.lojaId === lojaId)
  ) {
    return <Badge variant="blue">Recebe nesta filial</Badge>;
  }

  return null;
}

function nomesDosDestinos(remanejamento: Remanejamento): string {
  return remanejamento.destinos
    .map((destino) => getNomeLoja(destino.lojaId))
    .join(", ");
}

export function TabelaRemanejamentos({
  remanejamentos,
  basePath,
  lojaId,
}: {
  remanejamentos: Remanejamento[];
  basePath: string;
  lojaId?: LojaId;
}) {
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500">
              <th scope="col" className="px-3 py-3 font-semibold">
                Remanejamento
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Origem
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Destinos
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Volume
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                Criado em
              </th>
              <th scope="col" className="px-3 py-3">
                <span className="sr-only">Abrir</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {remanejamentos.map((remanejamento) => (
              <tr
                key={remanejamento.id}
                className="align-top transition-colors hover:bg-slate-50/80"
              >
                <td className="px-3 py-3">
                  <Link
                    href={`${basePath}/${remanejamento.id}`}
                    className="font-semibold text-slate-900 underline-offset-4 hover:text-red-700 hover:underline"
                  >
                    {remanejamento.numero}
                  </Link>
                  <div className="mt-1">
                    <PapelDaLoja
                      remanejamento={remanejamento}
                      lojaId={lojaId}
                    />
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {getNomeLoja(remanejamento.lojaOrigemId)}
                </td>
                <td className="max-w-44 px-3 py-3 text-slate-600">
                  {nomesDosDestinos(remanejamento)}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Boxes className="size-3.5 text-slate-400" aria-hidden="true" />
                    {totalDeLinhas(remanejamento)} itens
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {totalDeUnidades(remanejamento)} un.
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={remanejamento.status} />
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  {formatarData(remanejamento.criadoEm)}
                </td>
                <td className="px-3 py-3 text-right">
                  <Link
                    href={`${basePath}/${remanejamento.id}`}
                    aria-label={`Abrir ${remanejamento.numero}`}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-700"
                  >
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {remanejamentos.map((remanejamento) => (
          <li key={remanejamento.id}>
            <Link
              href={`${basePath}/${remanejamento.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-red-200 hover:bg-red-50/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {remanejamento.numero}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Criado em {formatarData(remanejamento.criadoEm)}
                  </p>
                </div>
                <StatusBadge status={remanejamento.status} />
              </div>

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                <p>
                  <span className="text-slate-500">Origem:</span>{" "}
                  {getNomeLoja(remanejamento.lojaOrigemId)}
                </p>
                <p>
                  <span className="text-slate-500">Destinos:</span>{" "}
                  {nomesDosDestinos(remanejamento)}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {totalDeLinhas(remanejamento)} itens ·{" "}
                  {totalDeUnidades(remanejamento)} un.
                </span>
                <PapelDaLoja remanejamento={remanejamento} lojaId={lojaId} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
