export function normalizarRotulo(valor: string | null | undefined): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function textoLimpo(valor: string | null | undefined): string {
  return String(valor ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove invólucros de fórmula do Excel (`="..."`) e aspas, sem converter
 * o conteúdo para número. Identificadores como pedido e CNPJ são textos.
 */
export function limparIdentificador(valor: string | null | undefined): string {
  let texto = textoLimpo(valor);

  if (texto.startsWith("=")) {
    texto = texto.slice(1).trim();
  }

  if (
    (texto.startsWith('"') && texto.endsWith('"')) ||
    (texto.startsWith("'") && texto.endsWith("'"))
  ) {
    texto = texto.slice(1, -1).trim();
  }

  return texto;
}

/**
 * Extrai o EAN como texto, preservando zeros à esquerda.
 * Aceita `="7891000056523"`, números inteiros e notação científica
 * produzida por planilhas, sem usar notação científica na saída.
 */
export function normalizarEan(valor: string | null | undefined): string {
  let texto = limparIdentificador(valor);

  if (!texto) {
    return "";
  }

  if (/^\d+\.0+$/.test(texto)) {
    texto = texto.split(".")[0];
  }

  if (/^\d+(?:[.,]\d+)?e[+-]?\d+$/i.test(texto)) {
    const numero = Number(texto.replace(",", "."));

    if (Number.isFinite(numero) && Number.isInteger(numero)) {
      texto = numero.toFixed(0);
    }
  }

  return texto.replace(/\D/g, "");
}
