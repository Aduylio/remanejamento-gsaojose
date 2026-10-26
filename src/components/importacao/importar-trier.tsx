"use client";

import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { prepararImportacaoTrier, confirmarImportacaoTrier } from "@/app/comprador/remanejamentos/novo/trier/actions";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import type { PreviewTrier } from "@/lib/trier/tipos";

export function ImportarTrier() {
  const { importarRemanejamentos } = useRemanejamentos();
  const [preview, setPreview] = useState<PreviewTrier | null>(null);
  const [importacaoId, setImportacaoId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    setPreview(null);
    setSucesso(false);

    try {
      const formData = new FormData(e.currentTarget);
      const res = await prepararImportacaoTrier(formData);
      if (res.status === "ok") {
        setPreview(res.preview);
        setImportacaoId(res.importacaoId);
      } else {
        setErro(res.mensagem);
      }
    } catch {
      setErro("Erro ao enviar arquivo.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmar() {
    if (!importacaoId || confirmando) return;
    setConfirmando(true);
    setErro(null);

    try {
      const res = await confirmarImportacaoTrier(importacaoId);
      if (res.status === "ok") {
        try {
          importarRemanejamentos(res.remanejamentos as any);
          setSucesso(true);
          setPreview(null);
        } catch {
          setErro("Importação confirmada, mas não foi possível exibir nesta sessão.");
          setSucesso(true);
        }
      } else if (res.status === "duplicada") {
        setErro(res.mensagem);
      } else if (res.status === "invalida") {
        setErro(res.erros?.join(" ") || "Inválida");
      } else {
        setErro(res.mensagem || "Falha");
      }
    } catch {
      setErro("Erro ao confirmar.");
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Comprador"
        title="Remanejamento do Trier"
        description="Importe o arquivo de transferência exportado pelo Trier."
        actions={
          <Link href="/comprador/remanejamentos/novo/modalidade" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Voltar
          </Link>
        }
      />

      {sucesso ? (
        <Alert variant="info">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>Importação concluída. Os remanejamentos foram criados.</p>
        </Alert>
      ) : null}

      {erro ? (
        <Alert variant="danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{erro}</p>
        </Alert>
      ) : null}

      {!sucesso && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Arquivo do Trier</h2>
          <p className="mt-0.5 text-sm text-slate-500">Envie .csv ou .xlsx</p>

          <form onSubmit={handleEnviar} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="arquivo">Arquivo</Label>
              <input
                ref={inputRef}
                id="arquivo"
                name="arquivo"
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="block h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:h-10 file:cursor-pointer file:border-0 file:border-r file:border-slate-300 file:bg-slate-50 file:px-3 file:text-sm file:font-medium file:text-slate-700"
              />
            </div>
            <Button type="submit" disabled={enviando}>
              {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Upload className="size-4" aria-hidden="true" />}
              {enviando ? "Analisando..." : "Analisar arquivo"}
            </Button>
          </form>
        </section>
      )}

      {preview && !sucesso ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Prévia</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {preview.grupos.length} grupo(s) encontrado(s). Os remanejamentos terão descrição igual ao número de controle.
          </p>

          {preview.erros.length > 0 ? (
            <Alert variant="danger" className="mt-4">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Erros impeditivos</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {preview.erros.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            </Alert>
          ) : null}

          {preview.avisos.length > 0 ? (
            <Alert variant="warning" className="mt-4">
              <p className="font-semibold">Avisos</p>
              <ul className="mt-1 space-y-1 text-sm">
                {preview.avisos.slice(0, 10).map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <div className="mt-4 space-y-4">
            {preview.grupos.map((grupo) => (
              <div key={`${grupo.controle}|${grupo.origem}|${grupo.destino}`} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Controle: {grupo.controle}</p>
                    <p className="text-xs text-slate-500">
                      {grupo.origem} → {grupo.destino}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {grupo.itens.length} produto(s) · Qtd. a separar: {grupo.quantidadeASeparar}
                  </p>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="py-2 pr-3">Cód. Reduzido</th>
                        <th className="py-2 pr-3">Produto</th>
                        <th className="py-2 pr-3 text-right">Solicitado</th>
                        <th className="py-2 text-right">Transferido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.itens.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100">
                          <td className="py-2 pr-3 font-mono text-xs">{item.codigoReduzido || "—"}</td>
                          <td className="py-2 pr-3">{item.produto || "—"}</td>
                          <td className="py-2 pr-3 text-right">{item.solicitado ?? "—"}</td>
                          <td className="py-2 text-right">{item.transferido ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={handleConfirmar} disabled={!preview.podeConfirmar || confirmando}>
              {confirmando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="size-4" aria-hidden="true" />}
              {confirmando ? "Confirmando..." : "Confirmar importação"}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
