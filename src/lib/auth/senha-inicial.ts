/**
 * Algoritmo determinístico para a credencial inicial provisória das filiais.
 *
 * - Remove acentos (NFD + remoção de diacríticos).
 * - Remove tudo que não seja letra ou número.
 * - Converte para minúsculas.
 * - Usa os 8 primeiros caracteres do nome normalizado (ou "filial" se vazio)
 *   concatenados com os 4 últimos dígitos do CNPJ.
 *
 * Exemplo: "Matriz" + "10846217000170" => "matriz0170".
 *
 * A senha resultante é previsível e deve ser trocada pela filial no primeiro
 * acesso. Nenhuma senha em texto puro é armazenada no banco; apenas o hash
 * bcrypt é persistido.
 */
export function normalizarComponente(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();
}

export function gerarSenhaInicial(nome: string, cnpj: string): string {
  const nomeNormalizado = normalizarComponente(nome);
  const cnpjDigitos = cnpj.replace(/\D/g, "");
  const sufixo = cnpjDigitos.slice(-4) || "0000";
  const prefixo = nomeNormalizado.slice(0, 8) || "filial";
  return `${prefixo}${sufixo}`;
}

export function gerarSenhaFixaPorLojaId(lojaId: string): string {
  const match = lojaId.match(/(\d+)$/);
  if (!match) {
    throw new Error(`Loja inválida para geração de senha fixa: ${lojaId}`);
  }
  const numero = Number(match[1]);
  if (numero === 11) {
    return "SAOJOSE11";
  }
  const sufixo = String(numero).padStart(2, "0");
  return `SAOJOSE${sufixo}`;
}
