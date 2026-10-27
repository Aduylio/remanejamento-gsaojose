export const LIMITE_TENTATIVAS = 3;
export const BLOQUEIO_MINUTOS = 2;
export const JANELA_TENTATIVAS_MINUTOS = 2;

export function chaveOrigem(params: {
  filialId?: string | null;
  ip?: string | null;
}): string {
  const filial = params.filialId || "global";
  const ip = params.ip || "desconhecido";
  return `${filial}|${ip}`;
}

export function chaveGlobal(ip?: string | null): string {
  return `global|${ip || "desconhecido"}`;
}

export function adicionarMinutos(data: Date, minutos: number): Date {
  const resultado = new Date(data);
  resultado.setMinutes(resultado.getMinutes() + minutos);
  return resultado;
}

export function calcularBloqueadoAte(agora: Date): Date {
  return adicionarMinutos(agora, BLOQUEIO_MINUTOS);
}

export function calcularInicioJanela(agora: Date): Date {
  return adicionarMinutos(agora, -JANELA_TENTATIVAS_MINUTOS);
}

export function bloqueioAtivo(
  bloqueadoAte: Date,
  agora: Date,
): boolean {
  return bloqueadoAte > agora;
}

/**
 * Recebe as tentativas da mais recente para a mais antiga e conta as falhas
 * consecutivas até o primeiro sucesso.
 */
export function contarConsecutivasInvalidas(
  tentativas: ReadonlyArray<{ sucesso: boolean; motivo?: string | null }>,
  limite = LIMITE_TENTATIVAS,
): number {
  let consecutivas = 0;
  for (const tentativa of tentativas) {
    if (tentativa.sucesso) break;
    if (tentativa.motivo === "bloqueado" || tentativa.motivo === "sem_senha") {
      continue;
    }
    consecutivas += 1;
    if (consecutivas >= limite) break;
  }
  return consecutivas;
}
