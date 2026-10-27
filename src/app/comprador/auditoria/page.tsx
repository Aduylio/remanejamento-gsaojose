import { redirect } from "next/navigation";

import { podeVisualizarAuditoria } from "@/lib/auth/permissoes";
import { sessaoCompradorAtiva } from "@/lib/auth/session";
import {
  interpretarPeriodo,
  listarLogsAuditoria,
} from "@/lib/db/auditoria";
import { listarFiliais } from "@/lib/db/filiais";

import { AuditoriaTabela } from "./_components/auditoria-tabela";

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const comprador = await sessaoCompradorAtiva();
  if (!podeVisualizarAuditoria({ comprador })) {
    redirect("/login?erro=comprador");
  }

  const params = await searchParams;
  const filialId = typeof params.filialId === "string" ? params.filialId : undefined;
  const tipoEvento = typeof params.tipoEvento === "string" ? params.tipoEvento : undefined;
  const resultado = typeof params.resultado === "string" ? params.resultado : undefined;
  const ip = typeof params.ip === "string" ? params.ip : undefined;
  const de = typeof params.de === "string" ? params.de : undefined;
  const ate = typeof params.ate === "string" ? params.ate : undefined;
  const cursor = typeof params.cursor === "string" ? params.cursor : undefined;
  const periodo = interpretarPeriodo(de, ate);

  const [logs, filiais] = await Promise.all([
    listarLogsAuditoria({
      limite: 100,
      filialId,
      tipoEvento,
      resultado,
      ip,
      cursor,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
    }),
    listarFiliais(),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-slate-500">Auditoria</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Logs de auditoria
        </h1>
        <p className="text-sm text-slate-500">
          Exibindo até 100 registros por consulta, ordenados por data decrescente.
        </p>
      </header>
      <AuditoriaTabela logs={logs.itens} filiais={filiais} proximoCursor={logs.proximoCursor} />
    </div>
  );
}
