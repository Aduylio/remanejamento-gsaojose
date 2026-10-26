import {
  gerarRemanejamentosDaImportacao,
  validarPreviewParaConfirmacao,
} from "@/lib/importacao/gerador";
import type { PreviewImportacao } from "@/lib/importacao/tipos";
import type { Remanejamento } from "@/lib/types";

export interface RepositorioImportacoes {
  /**
   * Contrato transacional: grava todos os remanejamentos ou nenhum.
   * Em uma integração com Supabase, esta operação deve usar uma transação.
   */
  inserirLoteAtomico(remanejamentos: Remanejamento[]): void;
}

export type ResultadoConfirmacao =
  | {
      status: "confirmada";
      referencia: string;
      remanejamentos: Remanejamento[];
      nadaACriar: boolean;
    }
  | { status: "duplicada"; mensagem: string }
  | { status: "invalida"; erros: string[] }
  | { status: "falha"; mensagem: string };

export interface DependenciasConfirmacao {
  preview: PreviewImportacao | null;
  jaConfirmada: boolean;
  repositorio: RepositorioImportacoes;
  marcarConfirmada: () => void;
  usuarioComprador?: string;
}

/**
 * Revalida a prévia no servidor, gera o lote completo e só então solicita a
 * gravação atômica. A importação só é marcada como confirmada depois do
 * sucesso da gravação; uma segunda tentativa não cria novos registros.
 */
export function confirmarImportacao(
  dependencias: DependenciasConfirmacao,
): ResultadoConfirmacao {
  if (dependencias.jaConfirmada) {
    return {
      status: "duplicada",
      mensagem:
        "Esta importação já foi confirmada. Nenhum remanejamento novo foi criado.",
    };
  }

  const erros = validarPreviewParaConfirmacao(dependencias.preview);

  if (erros.length > 0) {
    return { status: "invalida", erros };
  }

  const preview = dependencias.preview;

  if (!preview) {
    return {
      status: "invalida",
      erros: ["Prévia de importação não encontrada."],
    };
  }

  let remanejamentos: Remanejamento[];

  try {
    remanejamentos = gerarRemanejamentosDaImportacao(preview, {
      usuarioComprador: dependencias.usuarioComprador,
    });
  } catch {
    return {
      status: "falha",
      mensagem:
        "Não foi possível montar os remanejamentos. Nenhum registro foi gravado.",
    };
  }

  if (remanejamentos.length === 0) {
    dependencias.marcarConfirmada();

    return {
      status: "confirmada",
      referencia: preview.referencia,
      remanejamentos: [],
      nadaACriar: true,
    };
  }

  try {
    dependencias.repositorio.inserirLoteAtomico(remanejamentos);
  } catch {
    return {
      status: "falha",
      mensagem:
        "A gravação falhou. Nenhum remanejamento foi criado; tente novamente.",
    };
  }

  dependencias.marcarConfirmada();

  return {
    status: "confirmada",
    referencia: preview.referencia,
    remanejamentos,
    nadaACriar: false,
  };
}
