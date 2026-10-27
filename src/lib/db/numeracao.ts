import "server-only";

import { prisma } from "@/lib/prisma";

type ClienteNumeracao = {
  $queryRaw: typeof prisma.$queryRaw;
};

/**
 * Reserva a próxima sequência anual de remanejamentos de forma atômica no
 * PostgreSQL. O `INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING` garante
 * que chamadas concorrentes recebam valores distintos. A restrição `unique`
 * em `Remanejamento.numero` é a última barreira contra duplicidade.
 *
 * Números reservados que não forem
 * usados podem gerar lacunas na sequência; isso é preferível a reutilizar um
 * número ou bloquear a operação.
 */
export async function reservarNumeroRemanejamento(
  ano = new Date().getFullYear(),
  cliente: ClienteNumeracao = prisma,
): Promise<string> {
  const chave = `REM-${ano}`;

  const [registro] = await cliente.$queryRaw<Array<{ valor: bigint }>>`
    INSERT INTO "contadores_numeracao" ("chave", "valor", "atualizado_em")
    VALUES (${chave}, 1, NOW())
    ON CONFLICT ("chave") DO UPDATE
      SET "valor" = "contadores_numeracao"."valor" + 1,
          "atualizado_em" = NOW()
    RETURNING "valor"
  `;

  if (!registro) {
    throw new Error("Não foi possível reservar o número do remanejamento.");
  }

  return `${chave}-${String(registro.valor).padStart(4, "0")}`;
}
