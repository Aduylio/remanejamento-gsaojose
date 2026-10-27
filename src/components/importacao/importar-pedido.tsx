"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  PackageCheck,
  RotateCcw,
  Store,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import {
  confirmarImportacaoDoPedido,
  prepararImportacaoDoPedido,
} from "@/app/comprador/importar/actions";
import { useFiliais } from "@/components/providers/filiais-provider";
import { useRemanejamentos } from "@/components/providers/remanejamentos-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { formatarCnpj } from "@/lib/cnpj";
import type {
  DestinoPreview,
  OcorrenciaImportacao,
  PreviewImportacao,
  ProdutoImportado,
  ResultadoConfirmacaoImportacao,
  ResultadoPreparacaoImportacao,
} from "@/lib/importacao/tipos";
import { formatarDataHora, formatarUnidades } from "@/lib/format";
import type { LojaId } from "@/lib/types";

function ListaOcorrencias({
  ocorrencias,
  tom,
}: {
  ocorrencias: OcorrenciaImportacao[];
  tom: "erro" | "aviso";
}) {
  if (ocorrencias.length === 0) {
    return null;
  }

  return (
    <ul
      className={
        tom === "erro"
          ? "space-y-1.5 text-sm text-red-900"
          : "space-y-1.5 text-sm text-amber-900"
      }
    >
      {ocorrencias.slice(0, 12).map((ocorrencia, indice) => (
        <li key={`${ocorrencia.codigo}-${ocorrencia.linha ?? indice}-${indice}`}>
          {ocorrencia.mensagem}
        </li>
      ))}
      {ocorrencias.length > 12 ? (
        <li className="font-medium">
          Mais {ocorrencias.length - 12} ocorrência(s) semelhante(s).
        </li>
      ) : null}
    </ul>
  );
}

function Resumo({
  preview,
}: {
  preview: PreviewImportacao;
}) {
  const { getRotuloLoja } = useFiliais();
  const itens = [
    {
      label: "Loja física de origem",
      valor: getRotuloLoja(preview.lojaOrigemId),
    },
    { label: "Pedidos", valor: String(preview.resumo.pedidos.length) },
    {
      label: "Lojas de destino",
      valor: String(preview.resumo.totalDestinos),
    },
    {
      label: "Itens destinados",
      valor: `${preview.resumo.produtosDestinados} · ${formatarUnidades(preview.resumo.unidadesDestinadas)}`,
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-slate-900">
            {item.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function linhaProduto(produto: ProdutoImportado) {
  return (
    <tr key={`${produto.linha}-${produto.codigoReduzido ?? produto.ean ?? produto.descricao}`}>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">
        {produto.linha}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">
        {produto.codigoReduzido || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">
        {produto.ean || "—"}
      </td>
      <td className="min-w-56 px-3 py-2 text-slate-800">
        {produto.descricao || "Sem descrição"}
        {produto.repetidoNoPedido ? (
          <Badge variant="amber" className="ml-2 align-middle">
            Repetido
          </Badge>
        ) : null}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">
        {produto.laboratorio || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-600">
        {produto.pedidoNumero || "—"}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-slate-900">
        {produto.quantidade ?? "—"}
      </td>
    </tr>
  );
}

function TabelaProdutos({ produtos }: { produtos: ProdutoImportado[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-3 py-2 font-medium">Linha</th>
            <th className="px-3 py-2 font-medium">Código</th>
            <th className="px-3 py-2 font-medium">EAN</th>
            <th className="px-3 py-2 font-medium">Descrição</th>
            <th className="px-3 py-2 font-medium">Laboratório</th>
            <th className="px-3 py-2 font-medium">Pedido</th>
            <th className="px-3 py-2 text-right font-medium">Qtd.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {produtos.map(linhaProduto)}
        </tbody>
      </table>
    </div>
  );
}

function DetalheDestino({ destino }: { destino: DestinoPreview }) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Loja {String(destino.numero).padStart(2, "0")} · {destino.nome}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            CNPJ {formatarCnpj(destino.cnpj)} · {destino.itens.length} item(ns)
            {destino.totalUnidades > 0
              ? ` · ${formatarUnidades(destino.totalUnidades)}`
              : ""}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pedido(s): {destino.pedidos.join(", ") || "—"} · Fornecedor(es):{" "}
            {destino.fornecedores.join(", ") || "—"}
          </p>
        </div>
        <Badge variant="blue">Novo remanejamento</Badge>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200">
        <TabelaProdutos produtos={destino.itens} />
      </div>
    </section>
  );
}

function PainelPreview({
  preview,
  token,
  expiraEm,
  confirmando,
  onConfirmar,
}: {
  preview: PreviewImportacao;
  token: string;
  expiraEm: string;
  confirmando: boolean;
  onConfirmar: () => void;
}) {
  const { getRotuloLoja } = useFiliais();
  const temErros = preview.erros.length > 0;
  const podeConfirmar = preview.podeConfirmar && token.length > 0;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Prévia da importação
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {preview.arquivo} · referência {preview.referencia}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Válida até {formatarDataHora(expiraEm)}
          </span>
        </div>

        <div className="mt-5">
          <Resumo preview={preview} />
        </div>

        {preview.avisos.length > 0 ? (
          <Alert variant="warning" className="mt-5">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Avisos</p>
              <div className="mt-1">
                <ListaOcorrencias ocorrencias={preview.avisos} tom="aviso" />
              </div>
            </div>
          </Alert>
        ) : null}

        {temErros ? (
          <Alert variant="danger" className="mt-5">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Corrija os erros abaixo antes de confirmar
              </p>
              <div className="mt-1">
                <ListaOcorrencias ocorrencias={preview.erros} tom="erro" />
              </div>
            </div>
          </Alert>
        ) : null}

        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="text-sm text-slate-600">
            Itens que permanecem na loja de origem{" "}
            <strong className="font-semibold text-slate-900">
              {getRotuloLoja(preview.lojaOrigemId)}
            </strong>
            : {preview.resumo.produtosNaOrigem} ·{" "}
            {formatarUnidades(preview.resumo.unidadesNaOrigem)}. Nenhum
            remanejamento será criado para a própria origem.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-900">
          Remanejamentos que serão criados
        </h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Um remanejamento por loja de destino. Nada é gravado antes da
          confirmação.
        </p>
        <div className="mt-4">
          {preview.destinos.length === 0 ? (
            <p className="text-sm text-slate-600">
              Nenhum produto foi destinado a outra loja. Ajuste a loja de origem
              ou o arquivo para continuar.
            </p>
          ) : (
            preview.destinos.map((destino) => (
              <DetalheDestino key={destino.lojaId} destino={destino} />
            ))
          )}
        </div>
      </section>

      {preview.itensOrigem.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Itens que permanecem na origem
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Estes itens não geram remanejamento e continuam na loja de origem.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200">
            <TabelaProdutos produtos={preview.itensOrigem} />
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          A confirmação é revalidada no servidor e não cria registros parciais.
          Todos os remanejamentos são gravados em uma única transação.
        </p>
        <Button
          onClick={onConfirmar}
          disabled={!podeConfirmar || confirmando}
          size="lg"
          className="shrink-0"
        >
          {confirmando ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <PackageCheck className="size-4" aria-hidden="true" />
          )}
          {confirmando ? "Confirmando..." : "Confirmar importação"}
        </Button>
      </div>
    </div>
  );
}

function PainelConfirmacao({
  resultado,
  onReiniciar,
}: {
  resultado: Extract<ResultadoConfirmacaoImportacao, { status: "ok" }>;
  onReiniciar: () => void;
}) {
  const unidades = resultado.remanejamentos.reduce(
    (total, remanejamento) =>
      total +
      remanejamento.destinos.reduce(
        (subtotal, destino) =>
          subtotal +
          destino.itens.reduce((soma, item) => soma + item.quantidade, 0),
        0,
      ),
    0,
  );

  return (
    <section className="rounded-xl border border-emerald-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 size-5 shrink-0 text-emerald-600"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">
            Importação confirmada
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Referência {resultado.referencia}.{" "}
            {resultado.remanejamentos.length === 0
              ? "Nenhum remanejamento foi necessário."
              : `${resultado.remanejamentos.length} remanejamento(s) criado(s) com ${formatarUnidades(unidades)}.`}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Os remanejamentos foram gravados no banco e permanecem disponíveis
            após recarregar a página.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/comprador/remanejamentos"
              className={buttonVariants({ size: "sm" })}
            >
              Ver remanejamentos
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Button variant="secondary" size="sm" onClick={onReiniciar}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Importar outro arquivo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ImportarPedido() {
  const { importarRemanejamentos } = useRemanejamentos();
  const { filiais, getRotuloLoja, getCnpjFormatadoLoja } = useFiliais();
  const [lojaOrigemId, setLojaOrigemId] = useState<LojaId | "">("");
  const [resultado, setResultado] =
    useState<ResultadoPreparacaoImportacao | null>(null);
  const [confirmacao, setConfirmacao] =
    useState<ResultadoConfirmacaoImportacao | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const preview = resultado?.status === "ok" ? resultado.preview : null;
  const sucesso =
    confirmacao?.status === "ok" ? confirmacao : null;

  function reiniciar(): void {
    setResultado(null);
    setConfirmacao(null);
    setErroLocal(null);
    setLojaOrigemId("");
    if (inputArquivo.current) {
      inputArquivo.current.value = "";
    }
  }

  async function handleEnviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (enviando) {
      return;
    }

    setEnviando(true);
    setErroLocal(null);
    setConfirmacao(null);

    try {
      const resposta = await prepararImportacaoDoPedido(
        new FormData(event.currentTarget),
      );
      setResultado(resposta);
    } catch {
      setErroLocal(
        "Não foi possível enviar o arquivo. Verifique a conexão e tente novamente.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function handleConfirmar() {
    if (!resultado || resultado.status !== "ok" || confirmando) {
      return;
    }

    setConfirmando(true);
    setErroLocal(null);

    try {
      const resposta = await confirmarImportacaoDoPedido(
        resultado.preview.importacaoId,
        resultado.token,
      );

      if (resposta.status === "ok") {
        try {
          importarRemanejamentos(resposta.remanejamentos);
          setConfirmacao(resposta);
          setResultado(null);
          if (inputArquivo.current) {
            inputArquivo.current.value = "";
          }
        } catch {
          setErroLocal(
            "A importação foi confirmada no servidor, mas os dados não puderam ser exibidos agora. Recarregue a página para consultar a lista.",
          );
          setConfirmacao(resposta);
        }
      } else {
        setConfirmacao(resposta);
      }
    } catch {
      setErroLocal(
        "Não foi possível confirmar a importação. Nenhum remanejamento foi criado.",
      );
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Comprador"
        title="Importar pedido agrupado"
        description="Envie o pedido agrupado em .csv ou .xlsx. O vínculo com cada destino é feito pelo CNPJ da filial, com prévia antes de qualquer gravação."
        actions={
          <Link
            href="/comprador"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Voltar
          </Link>
        }
      />

      <div className="space-y-6">
        <Alert variant="info">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Importação persistente.</strong>{" "}
            A importação é validada e confirmada no servidor. Os
            remanejamentos só são gravados no banco após a confirmação.
          </p>
        </Alert>

        {erroLocal ? (
          <Alert variant="danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{erroLocal}</p>
          </Alert>
        ) : null}

        {sucesso ? (
          <PainelConfirmacao resultado={sucesso} onReiniciar={reiniciar} />
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-base font-semibold text-slate-900">
              1. Selecionar origem e arquivo
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Escolha a loja física que recebeu o pedido agrupado e envie a
              planilha original.
            </p>

            <form onSubmit={handleEnviar} className="mt-5 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="lojaOrigemId">Loja física de origem</Label>
                  <Select
                    id="lojaOrigemId"
                    name="lojaOrigemId"
                    value={lojaOrigemId}
                    onChange={(event) => {
                      setLojaOrigemId(event.target.value as LojaId | "");
                      setResultado(null);
                      setConfirmacao(null);
                    }}
                    required
                  >
                    <option value="">Selecione a loja</option>
                    {filiais.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {getRotuloLoja(loja.id)} —{" "}
                        {getCnpjFormatadoLoja(loja.id)}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Os itens do CNPJ desta loja permanecem nela e não geram
                    remanejamento.
                  </p>
                </div>

                <div>
                  <Label htmlFor="nomeRemanejamento">Nome do remanejamento *</Label>
                  <input
                    id="nomeRemanejamento"
                    name="nomeRemanejamento"
                    type="text"
                    required
                    placeholder="Ex.: NESTLÉ OUTUBRO 2026"
                    className="block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/10"
                    onChange={() => {
                      setResultado(null);
                      setConfirmacao(null);
                    }}
                  />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Campo obrigatório.
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="arquivo">Arquivo .csv ou .xlsx</Label>
                <input
                  ref={inputArquivo}
                  id="arquivo"
                  name="arquivo"
                  type="file"
                  accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  required
                  onChange={() => {
                    setResultado(null);
                    setConfirmacao(null);
                  }}
                  className="block h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white text-sm text-slate-600 file:mr-3 file:h-10 file:cursor-pointer file:border-0 file:border-r file:border-slate-300 file:bg-slate-50 file:px-3 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Até 6 MB. Arquivos .xls não são aceitos; salve como .xlsx ou
                  .csv.
                </p>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-slate-500">
                  <FileSpreadsheet className="size-4" aria-hidden="true" />
                  Estrutura esperada: Pedido, Data Pedido, Fornecedor, CNPJ
                  Filial, Nome Filial e, abaixo, os produtos.
                </p>
                <Button
                  type="submit"
                  disabled={enviando}
                  className="shrink-0"
                >
                  {enviando ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Upload className="size-4" aria-hidden="true" />
                  )}
                  {enviando ? "Analisando..." : "Analisar arquivo"}
                </Button>
              </div>
            </form>
          </section>
        )}

        {resultado?.status === "erro" ? (
          <Alert variant="danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Não foi possível analisar o arquivo</p>
              <p className="mt-1">{resultado.mensagem}</p>
              {resultado.ocorrencias && resultado.ocorrencias.length > 0 ? (
                <div className="mt-2">
                  <ListaOcorrencias
                    ocorrencias={resultado.ocorrencias}
                    tom="erro"
                  />
                </div>
              ) : null}
            </div>
          </Alert>
        ) : null}

        {preview && resultado?.status === "ok" ? (
          <PainelPreview
            preview={preview}
            token={resultado.token}
            expiraEm={resultado.expiraEm}
            confirmando={confirmando}
            onConfirmar={handleConfirmar}
          />
        ) : null}

        {confirmacao && confirmacao.status !== "ok" ? (
          <Alert
            variant={confirmacao.status === "duplicada" ? "warning" : "danger"}
          >
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">
                {confirmacao.status === "duplicada"
                  ? "Importação já confirmada"
                  : "Importação não confirmada"}
              </p>
              {confirmacao.status === "invalida" ? (
                <ul className="mt-1 space-y-1">
                  {confirmacao.erros.map((erro) => (
                    <li key={erro}>{erro}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">{confirmacao.mensagem}</p>
              )}
            </div>
          </Alert>
        ) : null}

        <section className="border-t border-slate-200 pt-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Store className="size-4 text-slate-500" aria-hidden="true" />
            Como o arquivo é interpretado
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
            <li>
              Blocos de pedido são lidos em sequência, com linhas em branco
              permitidas entre eles.
            </li>
            <li>
              O CNPJ da filial é normalizado para 14 dígitos e comparado ao
              cadastro oficial. Nome da filial e número da loja não são usados
              para o vínculo.
            </li>
            <li>
              EANs em fórmula, como <code>=&quot;7891000056523&quot;</code>, são
              lidos como texto e mantêm zeros à esquerda.
            </li>
            <li>
              Produtos repetidos no mesmo pedido são preservados linha a linha e
              sinalizados na prévia.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
