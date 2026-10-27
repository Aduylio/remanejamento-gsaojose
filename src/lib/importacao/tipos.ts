import type { Loja, LojaId, Remanejamento } from "@/lib/types";

export interface OcorrenciaImportacao {
  codigo: string;
  mensagem: string;
  bloqueante: boolean;
  linha?: number;
  pedido?: string;
  cnpj?: string;
}

export interface ProdutoImportado {
  linha: number;
  pedidoNumero: string;
  pedidoData: string;
  fornecedor: string;
  cnpjFilial: string;
  nomeFilialArquivo: string;
  codigoReduzido?: string;
  ean?: string;
  descricao: string;
  laboratorio?: string;
  quantidade: number | null;
  quantidadeInformada: string;
  erroQuantidade?: string;
  erroIdentificacao?: string;
  repetidoNoPedido?: boolean;
}

export interface BlocoPedido {
  indice: number;
  linhaCabecalho: number;
  linhaDados?: number;
  pedidoNumero: string;
  pedidoData: string;
  fornecedor: string;
  cnpjInformado: string;
  cnpjNormalizado: string;
  nomeFilialArquivo: string;
  lojaId?: LojaId;
  produtos: ProdutoImportado[];
  ocorrencias: OcorrenciaImportacao[];
}

export interface DestinoPreview {
  lojaId: LojaId;
  numero: number;
  nome: string;
  cnpj: string;
  pedidos: string[];
  fornecedores: string[];
  itens: ProdutoImportado[];
  totalUnidades: number;
}

export interface ResumoPreview {
  lojaOrigemId: LojaId;
  lojasIdentificadas: number;
  blocosProcessados: number;
  fornecedores: string[];
  pedidos: string[];
  produtosDestinados: number;
  unidadesDestinadas: number;
  produtosNaOrigem: number;
  unidadesNaOrigem: number;
  totalDestinos: number;
}

export interface PreviewImportacao {
  importacaoId: string;
  referencia: string;
  arquivo: string;
  criadoEm: string;
  lojaOrigemId: LojaId;
  resumo: ResumoPreview;
  destinos: DestinoPreview[];
  itensOrigem: ProdutoImportado[];
  erros: OcorrenciaImportacao[];
  avisos: OcorrenciaImportacao[];
  podeConfirmar: boolean;
}

export interface AnaliseImportacao {
  preview: PreviewImportacao;
  blocos: BlocoPedido[];
}

export interface OpcoesAnaliseImportacao {
  lojaOrigemId: LojaId;
  arquivo: string;
  importacaoId: string;
  referencia: string;
  criadoEm: string;
  filiais: readonly Loja[];
}

export type ResultadoPreparacaoImportacao =
  | {
      status: "ok";
      preview: PreviewImportacao;
      token: string;
      expiraEm: string;
    }
  | {
      status: "erro";
      mensagem: string;
      ocorrencias?: OcorrenciaImportacao[];
    };

export type ResultadoConfirmacaoImportacao =
  | {
      status: "ok";
      referencia: string;
      remanejamentos: Remanejamento[];
      nadaACriar: boolean;
    }
  | { status: "duplicada"; mensagem: string }
  | { status: "invalida"; erros: string[] }
  | { status: "falha"; mensagem: string };
