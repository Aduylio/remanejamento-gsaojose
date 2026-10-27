import {
  gerarRemanejamentosDaImportacao,
  validarPreviewParaConfirmacao,
} from "@/lib/importacao/gerador";
import type { PreviewImportacao } from "@/lib/importacao/tipos";
import type { Loja, Remanejamento } from "@/lib/types";

export interface RepositorioImportacoes {
  /**
   * Contrato transacional: grava todos os remanejamentos ou nenhum.
   * Retorna os registros persistidos, com os identificadores definitivos.
   */
  inserirLoteAtomico(
    remanejamentos: Remanejamento[],
  ): Remanejamento[] | Promise<Remanejamento[]>;
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
  marcarConfirmada: () => void | Promise<void>;
  usuarioComprador?: string;
  filiais: readonly Loja[];
}

/**
 * Revalida a prévia no servidor, gera o lote completo e só então solicita a
 * gravação atômica. A importação só é marcada como confirmada depois do
 * sucesso da gravação; uma segunda tentativa não cria novos registros.
 */
export async function confirmarImportacao(
  dependencias: DependenciasConfirmacao,
): Promise<ResultadoConfirmacao> {
  if (dependencias.jaConfirmada) {
    return {
      status: "duplicada",
      mensagem:
        "Esta importação já foi confirmada. Nenhum remanejamento novo foi criado.",
    };
  }

  const erros = validarPreviewParaConfirmacao(
    dependencias.preview,
    dependencias.filiais,
  );

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
    await dependencias.marcarConfirmada();

    return {
      status: "confirmada",
      referencia: preview.referencia,
      remanejamentos: [],
      nadaACriar: true,
    };
  }

  let persistidos: Remanejamento[];

  try {
    persistidos = await dependencias.repositorio.inserirLoteAtomico(
      remanejamentos,
    );
  } catch {
    return {
      status: "falha",
      mensagem:
        "A gravação falhou. Nenhum remanejamento foi criado; tente novamente.",
    };
  }

  await dependencias.marcarConfirmada();

  return {
    status: "confirmada",
    referencia: preview.referencia,
    remanejamentos: persistidos,
    nadaACriar: false,
  };
}
