/**
 * Normaliza um CNPJ mantendo todos os dígitos, inclusive zeros à esquerda.
 * Não converte o valor para número em nenhum momento.
 */
export function normalizarCnpj(valor: string | null | undefined): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function formatarCnpj(valor: string | null | undefined): string {
  const digits = normalizarCnpj(valor);

  if (digits.length !== 14) {
    return String(valor ?? "");
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function cnpjValido(valor: string | null | undefined): boolean {
  return normalizarCnpj(valor).length === 14;
}
