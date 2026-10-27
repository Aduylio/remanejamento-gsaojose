export type LojaId =
  | "loja-01"
  | "loja-02"
  | "loja-03"
  | "loja-04"
  | "loja-05"
  | "loja-06"
  | "loja-07"
  | "loja-08"
  | "loja-09"
  | "loja-10"
  | "loja-11";

export interface Loja {
  id: LojaId;
  numero: number;
  nome: string;
  /** CNPJ normalizado, somente dígitos. */
  cnpj: string;
  /** Indica que a senha ainda é a credencial inicial provisória. */
  precisaTrocarSenha?: boolean;
}

export type StatusSeparacao = "pendente" | "em_separacao" | "separada";

export interface ItemRemanejamento {
  id: string;
  nome: string;
  ean?: string;
  quantidade: number;
  separado: boolean;
  codigoReduzido?: string;
  laboratorio?: string;
  pedidoNumero?: string;
  pedidoData?: string;
  fornecedor?: string;
  cnpjFilial?: string;
  nomeFilialArquivo?: string;
  linhaImportada?: number;
  repetidoNoPedido?: boolean;
}

export interface DestinoRemanejamento {
  lojaId: LojaId;
  itens: ItemRemanejamento[];
}

export interface VinculoImportacao {
  importacaoId: string;
  referencia: string;
  arquivo: string;
  importadoEm: string;
  lojaOrigemFisicaId: LojaId;
  /** Reservado para quando houver autenticação real do comprador. */
  usuarioComprador?: string;
  pedidos: string[];
  fornecedores: string[];
  /** CNPJ normalizado da filial de destino. */
  cnpjFilial: string;
  nomeFilialArquivo?: string;
}

export interface Remanejamento {
  id: string;
  numero: string;
  lojaOrigemId: LojaId;
  destinos: DestinoRemanejamento[];
  observacoes?: string;
  criadoEm: string;
  status: StatusSeparacao;
  responsavelSeparacao?: string;
  iniciadoEm?: string;
  separadoEm?: string;
  pedidoNumero?: string;
  pedidoData?: string;
  fornecedor?: string;
  importacao?: VinculoImportacao;
}

export interface DistribuicaoProduto {
  lojaId: LojaId;
  quantidade: number;
}

export interface ProdutoNovoRemanejamento {
  nome: string;
  ean?: string;
  quantidades: DistribuicaoProduto[];
}

export interface NovoRemanejamentoInput {
  lojaOrigemId: LojaId;
  destinos: LojaId[];
  produtos: ProdutoNovoRemanejamento[];
  observacoes?: string;
}

export type RelacaoFiltro = "todas" | "separar" | "receber";

export type StatusFiltro = StatusSeparacao | "todos";
