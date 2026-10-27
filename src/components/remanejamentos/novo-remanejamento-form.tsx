"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  MapPin,
  Package,
  Plus,
  Store,
  Trash2,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { useFiliais } from "@/components/providers/filiais-provider";
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
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { formatarUnidades } from "@/lib/format";
import type { LojaId, NovoRemanejamentoInput, Remanejamento } from "@/lib/types";

interface ProdutoFormulario {
  chave: string;
  nome: string;
  ean: string;
  quantidades: Partial<Record<LojaId, string>>;
}

function produtoVazio(chave: string): ProdutoFormulario {
  return { chave, nome: "", ean: "", quantidades: {} };
}

function somarQuantidade(
  produto: ProdutoFormulario,
  destinos: LojaId[],
): number {
  return destinos.reduce(
    (total, lojaId) => total + (Number(produto.quantidades[lojaId]) || 0),
    0,
  );
}

export function NovoRemanejamentoForm() {
  const router = useRouter();
  const { criarRemanejamento } = useRemanejamentos();
  const { filiais, getNomeLoja, isLojaId } = useFiliais();
  const [origem, setOrigem] = useState<LojaId | "">("");
  const [destinos, setDestinos] = useState<LojaId[]>([]);
  const [produtos, setProdutos] = useState<ProdutoFormulario[]>(() => [
    produtoVazio("produto-1"),
  ]);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [criado, setCriado] = useState<Remanejamento | null>(null);
  const [criando, setCriando] = useState(false);
  const proximaChave = useRef(2);

  const lojasDisponiveis = filiais.filter((loja) => loja.id !== origem);
  const lojasDeDestino = filiais.filter((loja) => destinos.includes(loja.id));
  const totalUnidades = produtos.reduce(
    (total, produto) => total + somarQuantidade(produto, destinos),
    0,
  );
  const linhasComQuantidade = produtos.filter(
    (produto) => somarQuantidade(produto, destinos) > 0,
  ).length;

  function selecionarOrigem(valor: string) {
    const lojaId = isLojaId(valor) ? valor : "";
    setOrigem(lojaId);
    setErro(null);

    if (lojaId) {
      setDestinos((atuais) => atuais.filter((id) => id !== lojaId));
    }
  }

  function alternarDestino(lojaId: LojaId) {
    setErro(null);
    setDestinos((atuais) =>
      atuais.includes(lojaId)
        ? atuais.filter((id) => id !== lojaId)
        : [...atuais, lojaId],
    );
  }

  function atualizarProduto(
    chave: string,
    campo: "nome" | "ean",
    valor: string,
  ) {
    const valorTratado =
      campo === "ean" ? valor.replace(/\D/g, "").slice(0, 14) : valor;

    setProdutos((atuais) =>
      atuais.map((produto) =>
        produto.chave === chave
          ? { ...produto, [campo]: valorTratado }
          : produto,
      ),
    );
  }

  function atualizarQuantidade(
    chave: string,
    lojaId: LojaId,
    valor: string,
  ) {
    const quantidade = valor.replace(/\D/g, "").slice(0, 6);

    setProdutos((atuais) =>
      atuais.map((produto) =>
        produto.chave === chave
          ? {
              ...produto,
              quantidades: { ...produto.quantidades, [lojaId]: quantidade },
            }
          : produto,
      ),
    );
  }

  function adicionarProduto() {
    const chave = `produto-${proximaChave.current}`;
    proximaChave.current += 1;
    setProdutos((atuais) => [...atuais, produtoVazio(chave)]);
  }

  function removerProduto(chave: string) {
    setProdutos((atuais) =>
      atuais.length === 1
        ? atuais
        : atuais.filter((produto) => produto.chave !== chave),
    );
  }

  function reiniciarFormulario() {
    setCriado(null);
    setOrigem("");
    setDestinos([]);
    setProdutos([produtoVazio("produto-1")]);
    proximaChave.current = 2;
    setObservacoes("");
    setErro(null);
  }

  function validar(): string | null {
    if (!origem) {
      return "Selecione a loja de origem.";
    }

    if (destinos.length === 0) {
      return "Selecione pelo menos uma loja de destino.";
    }

    if (destinos.includes(origem)) {
      return "A loja de origem não pode ser também destino.";
    }

    const identificadores = new Set<string>();

    for (let indice = 0; indice < produtos.length; indice += 1) {
      const produto = produtos[indice];
      const nome = produto.nome.trim();
      const ean = produto.ean.trim();

      if (!nome) {
        return `Informe o nome do produto ${indice + 1}.`;
      }

      if (ean && !/^\d{8,14}$/.test(ean)) {
        return `O EAN do produto ${indice + 1} deve ter de 8 a 14 dígitos.`;
      }

      if (somarQuantidade(produto, destinos) <= 0) {
        return `Informe a quantidade do produto ${indice + 1} em pelo menos um destino.`;
      }

      const identificador = `${nome.toLowerCase()}|${ean}`;

      if (identificadores.has(identificador)) {
        return `O produto "${nome}" está duplicado. Remova ou altere a duplicidade.`;
      }

      identificadores.add(identificador);
    }

    const destinoSemQuantidade = destinos.find((lojaId) => {
      const totalDestino = produtos.reduce(
        (total, produto) => total + (Number(produto.quantidades[lojaId]) || 0),
        0,
      );

      return totalDestino <= 0;
    });

    if (destinoSemQuantidade) {
      return `Informe pelo menos uma unidade para ${getNomeLoja(destinoSemQuantidade)} ou remova esse destino.`;
    }

    if (totalUnidades <= 0) {
      return "Distribua pelo menos uma unidade entre os destinos.";
    }

    return null;
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const mensagem = validar();

    if (mensagem) {
      setErro(mensagem);
      return;
    }

    if (!origem || criando) {
      return;
    }

    setErro(null);
    setCriando(true);

    const entrada: NovoRemanejamentoInput = {
      lojaOrigemId: origem,
      destinos,
      produtos: produtos.map((produto) => ({
        nome: produto.nome.trim(),
        ean: produto.ean.trim() || undefined,
        quantidades: destinos.map((lojaId) => ({
          lojaId,
          quantidade: Number(produto.quantidades[lojaId]) || 0,
        })),
      })),
      observacoes: observacoes.trim() || undefined,
    };

    try {
      setCriado(await criarRemanejamento(entrada));
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o remanejamento.",
      );
    } finally {
      setCriando(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Digitar manualmente"
        actions={
          <Link
            href="/comprador/remanejamentos/novo/modalidade"
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar para a lista
          </Link>
        }
      />

      <form
        onSubmit={aoEnviar}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
      >
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
                  <Store className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Loja de origem</CardTitle>
                  <CardDescription>
                    Filial que possui a mercadoria e fará a separação.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <Label htmlFor="loja-origem">Filial de origem</Label>
              <Select
                id="loja-origem"
                value={origem}
                onChange={(evento) => selecionarOrigem(evento.target.value)}
                aria-describedby="origem-ajuda"
              >
                <option value="" disabled>
                  Selecione a loja de origem
                </option>
                {filiais.map((loja) => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </Select>
              <p
                id="origem-ajuda"
                className="mt-2 text-xs leading-relaxed text-slate-500"
              >
                A loja de origem não pode ser selecionada como destino.
              </p>
              {origem ? (
                <div className="mt-3">
                  <Badge variant="red">
                    <MapPin className="size-3" aria-hidden="true" />
                    Separação em {getNomeLoja(origem)}
                  </Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700">
                  <Truck className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle>Lojas de destino</CardTitle>
                  <CardDescription>
                    Selecione uma ou mais filiais que receberão os produtos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              {!origem ? (
                <Alert variant="info">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    Selecione primeiro a loja de origem para liberar os destinos.
                  </span>
                </Alert>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>
                      {destinos.length} de {lojasDisponiveis.length} destinos
                      selecionados
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setDestinos(lojasDisponiveis.map((loja) => loja.id))
                        }
                      >
                        Selecionar todas
                      </Button>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setDestinos([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {lojasDisponiveis.map((loja) => {
                      const selecionada = destinos.includes(loja.id);

                      return (
                        <label
                          key={loja.id}
                          className={
                            selecionada
                              ? "flex cursor-pointer items-center gap-3 rounded-lg border border-red-300 bg-red-50/70 p-3 transition-colors"
                              : "flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selecionada}
                            onChange={() => alternarDestino(loja.id)}
                            className="size-4 shrink-0 accent-red-600"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">
                              {loja.nome}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {selecionada ? "Destino selecionado" : "Destino"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                    <Package className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle>Produtos</CardTitle>
                    <CardDescription>
                      Informe nome, EAN opcional e a quantidade por destino.
                    </CardDescription>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={adicionarProduto}>
                  <Plus className="size-4" aria-hidden="true" />
                  Adicionar produto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 sm:pt-2">
              {produtos.map((produto, indice) => (
                <div
                  key={produto.chave}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Produto {indice + 1}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover produto ${indice + 1}`}
                      onClick={() => removerProduto(produto.chave)}
                      disabled={produtos.length === 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <div>
                      <Label htmlFor={`${produto.chave}-nome`}>
                        Nome do produto
                      </Label>
                      <Input
                        id={`${produto.chave}-nome`}
                        value={produto.nome}
                        onChange={(evento) =>
                          atualizarProduto(
                            produto.chave,
                            "nome",
                            evento.target.value,
                          )
                        }
                        placeholder="Ex.: Soro fisiológico 0,9% — 250 ml"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${produto.chave}-ean`}>
                        EAN <span className="font-normal">(opcional)</span>
                      </Label>
                      <Input
                        id={`${produto.chave}-ean`}
                        value={produto.ean}
                        onChange={(evento) =>
                          atualizarProduto(
                            produto.chave,
                            "ean",
                            evento.target.value,
                          )
                        }
                        placeholder="Somente números"
                        inputMode="numeric"
                        maxLength={14}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Quantidades por destino
                    </p>
                    {lojasDeDestino.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                        Selecione os destinos para informar as quantidades. Use 0
                        ou deixe vazio quando o produto não for enviado.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {lojasDeDestino.map((loja) => (
                          <div key={loja.id}>
                            <Label
                              htmlFor={`${produto.chave}-${loja.id}`}
                              className="text-xs"
                            >
                              {loja.nome}
                            </Label>
                            <Input
                              id={`${produto.chave}-${loja.id}`}
                              value={produto.quantidades[loja.id] ?? ""}
                              onChange={(evento) =>
                                atualizarQuantidade(
                                  produto.chave,
                                  loja.id,
                                  evento.target.value,
                                )
                              }
                              placeholder="0"
                              inputMode="numeric"
                              maxLength={6}
                              className="text-right tabular-nums"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
              <CardDescription>
                Instruções opcionais para a filial que fará a separação.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <Label htmlFor="observacoes">Observações do remanejamento</Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(evento) =>
                  setObservacoes(evento.target.value.slice(0, 500))
                }
                placeholder="Ex.: priorizar itens com validade mais próxima."
                maxLength={500}
              />
              <p className="mt-1.5 text-right text-xs text-slate-400">
                {observacoes.length}/500
              </p>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
              <CardDescription>
                Confira as informações antes de criar.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 sm:pt-2">
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Origem</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {origem ? getNomeLoja(origem) : "Não definida"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Destinos</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {destinos.length > 0
                      ? lojasDeDestino.map((loja) => loja.nome).join(", ")
                      : "Nenhum"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Produtos</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {linhasComQuantidade} de {produtos.length}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Unidades</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {formatarUnidades(totalUnidades)}
                  </dd>
                </div>
              </dl>

              {erro ? (
                <Alert variant="danger" className="mt-4">
                  <AlertCircle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{erro}</span>
                </Alert>
              ) : null}

              <Button
                type="submit"
                className="mt-4 w-full"
                disabled={criando}
              >
                <Truck className="size-4" aria-hidden="true" />
                {criando ? "Criando..." : "Criar remanejamento"}
              </Button>

              <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
                O remanejamento será gravado no banco de dados.
              </p>
            </CardContent>
          </Card>

          <Alert variant="warning">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              O número é reservado de forma atômica no banco.
            </span>
          </Alert>
        </aside>
      </form>

      <Dialog
        open={Boolean(criado)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setCriado(null);
          }
        }}
        title="Remanejamento criado"
        description="A tarefa já está disponível para a filial de origem."
      >
        {criado ? (
          <div className="space-y-4">
            <Alert variant="success">
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold">{criado.numero}</strong> foi
                criado com {criado.destinos.length}{" "}
                {criado.destinos.length === 1 ? "destino" : "destinos"}.
              </span>
            </Alert>

            <dl className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between gap-3 border-b border-slate-200 pb-2">
                <dt className="text-slate-500">Origem</dt>
                <dd className="font-medium text-slate-900">
                  {getNomeLoja(criado.lojaOrigemId)}
                </dd>
              </div>
              <div className="flex justify-between gap-3 border-b border-slate-200 py-2">
                <dt className="text-slate-500">Destinos</dt>
                <dd className="text-right font-medium text-slate-900">
                  {criado.destinos
                    .map((destino) => getNomeLoja(destino.lojaId))
                    .join(", ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3 pt-2">
                <dt className="text-slate-500">Status inicial</dt>
                <dd className="font-medium text-slate-900">Pendente</dd>
              </div>
            </dl>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={reiniciarFormulario}>
                Criar outro
              </Button>
              <Button
                onClick={() => {
                  const id = criado.id;
                  setCriado(null);
                  router.push(`/comprador/remanejamentos/${id}`);
                }}
              >
                Ver remanejamento
              </Button>
            </div>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
