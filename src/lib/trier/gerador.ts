import { randomUUID } from "node:crypto";
import type { GrupoTrier } from "@/lib/trier/tipos";
import type { ItemRemanejamento, Remanejamento } from "@/lib/types";
import { getLoja } from "@/data/lojas";

export function gerarRemanejamentosDoTrier(
  grupos: GrupoTrier[],
  opcoes?: { usuarioComprador?: string },
): Remanejamento[] {
  const agora = new Date().toISOString();

  return grupos
    .filter((grupo) => grupo.origemLojaId && grupo.destinoLojaId && grupo.origemLojaId !== grupo.destinoLojaId)
    .map((grupo) => {
      const itens: ItemRemanejamento[] = grupo.itens
        .filter((item) => item.transferido !== null && item.transferido > 0)
        .map((item) => ({
          id: randomUUID(),
          nome: item.produto || item.codigoReduzido,
          quantidade: item.transferido as number,
          separado: false,
          codigoReduzido: item.codigoReduzido || undefined,
        }));

      const remanejamento: Remanejamento = {
        id: randomUUID(),
        numero: grupo.controle, // Use control number as description/number
        lojaOrigemId: grupo.origemLojaId!,
        destinos: [
          {
            lojaId: grupo.destinoLojaId!,
            itens,
          },
        ],
        criadoEm: agora,
        status: "pendente",
      };

      return remanejamento;
    });
}
