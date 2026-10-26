"use server";

import { randomUUID } from "node:crypto";

const sequenciaPorDia = new Map<string, number>();

export async function gerarNumeroRemanejamentoManual(): Promise<string> {
  const agora = new Date();
  const dia = String(agora.getDate()).padStart(2, "0");
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const chave = `${agora.getFullYear()}-${mes}-${dia}`;
  
  const atual = sequenciaPorDia.get(chave) || 0;
  const proximo = atual + 1;
  sequenciaPorDia.set(chave, proximo);
  
  return `REM ${dia}/${mes}-${String(proximo).padStart(4, "0")}`;
}
