import type { LojaId } from "@/lib/types";

export interface LinhaTrier {
  controle: string;
  numeroFiscalSerie?: string;
  data?: string;
  origem: string;
  destino: string;
  codigoReduzido: string;
  produto: string;
  solicitado: number | null;
  transferido: number | null;
  linha: number;
  erros?: string[];
}

export interface GrupoTrier {
  controle: string;
  origem: string;
  destino: string;
  origemLojaId?: LojaId;
  destinoLojaId?: LojaId;
  itens: LinhaTrier[];
  totalSolicitado: number;
  totalTransferido: number;
  quantidadeASeparar: number;
}

export interface PreviewTrier {
  grupos: GrupoTrier[];
  erros: string[];
  avisos: string[];
  podeConfirmar: boolean;
}
