"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { criarCatalogoFiliais } from "@/lib/filiais";
import type { Loja } from "@/lib/types";
import type { LogAuditoriaListaItem } from "@/lib/db/auditoria";

function formatarData(data: string): string {
  try {
    return new Date(data).toLocaleString();
  } catch {
    return data;
  }
}

export function AuditoriaTabela({
  logs,
  filiais,
  proximoCursor,
}: {
  logs: LogAuditoriaListaItem[];
  filiais: Loja[];
  proximoCursor: string | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getRotuloLoja } = criarCatalogoFiliais(filiais);

  function montarUrl(cursor?: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (cursor) {
      params.set("cursor", cursor);
    } else {
      params.delete("cursor");
    }
    return `${pathname}?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-7">
        <div>
          <Label htmlFor="filialId">Filial</Label>
          <Select id="filialId" name="filialId" defaultValue={searchParams.get("filialId") ?? ""}>
            <option value="">Todas</option>
            {filiais.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {getRotuloLoja(loja.id)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="tipoEvento">Tipo</Label>
          <Select id="tipoEvento" name="tipoEvento" defaultValue={searchParams.get("tipoEvento") ?? ""}>
            <option value="">Todos</option>
            <option value="login">login</option>
            <option value="logout">logout</option>
            <option value="remanejamento">remanejamento</option>
            <option value="importacao">importacao</option>
            <option value="autorizacao">autorizacao</option>
            <option value="bloqueio">bloqueio</option>
            <option value="credencial">credencial</option>
            <option value="permissao">permissao</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="resultado">Resultado</Label>
          <Select id="resultado" name="resultado" defaultValue={searchParams.get("resultado") ?? ""}>
            <option value="">Todos</option>
            <option value="sucesso">sucesso</option>
            <option value="falha">falha</option>
            <option value="bloqueio">bloqueio</option>
            <option value="negacao">negacao</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="de">De</Label>
          <input
            id="de"
            name="de"
            type="date"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            defaultValue={searchParams.get("de") ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="ate">Até</Label>
          <input
            id="ate"
            name="ate"
            type="date"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            defaultValue={searchParams.get("ate") ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="ip">IP</Label>
          <input
            id="ip"
            name="ip"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            defaultValue={searchParams.get("ip") ?? ""}
            placeholder="Filtrar por IP"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit">Filtrar</Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2">Data/Hora</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2">Ação</th>
              <th className="px-4 py-2">Resultado</th>
              <th className="px-4 py-2">Filial</th>
              <th className="px-4 py-2">IP</th>
              <th className="px-4 py-2">Origem/Sessão</th>
              <th className="px-4 py-2">Entidade</th>
              <th className="px-4 py-2">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-700">{formatarData(log.criadoEm)}</td>
                <td className="px-4 py-2">{log.tipoEvento}</td>
                <td className="px-4 py-2">{log.acao}</td>
                <td className="px-4 py-2">{log.resultado}</td>
                <td className="px-4 py-2">
                  {log.filialId
                    ? filiais.some((filial) => filial.id === log.filialId)
                      ? getRotuloLoja(log.filialId)
                      : log.filialId
                    : "-"}
                </td>
                <td className="px-4 py-2">{log.ipObservado ?? "-"}</td>
                <td className="px-4 py-2">{log.origemId ?? log.sessaoId ?? "-"}</td>
                <td className="px-4 py-2">{log.entidadeTipo && log.entidadeId ? `${log.entidadeTipo}:${log.entidadeId}` : "-"}</td>
                <td className="px-4 py-2 max-w-md truncate" title={log.descricao}>{log.descricao}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        {proximoCursor ? (
          <Link href={montarUrl(proximoCursor)}>
            <Button variant="outline">Carregar mais antigos</Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
