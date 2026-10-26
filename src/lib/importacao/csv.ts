/**
 * Leitor de CSV tolerante para os arquivos de pedido.
 * Suporta ponto e vírgula (padrão), vírgula ou tabulação, campos entre
 * aspas, aspas escapadas e quebras de linha dentro de campos.
 */
export function parseCsv(texto: string): string[][] {
  const conteudo = texto.replace(/^\uFEFF/, "");

  if (!conteudo.trim()) {
    return [];
  }

  const linhas = lerLinhasCsv(conteudo, detectarDelimitador(conteudo));

  if (linhas.length > 0) {
    const primeira = linhas[0].join("").trim().toLowerCase();

    if (/^sep\s*=\s*[;,|\t]$/.test(primeira)) {
      return linhas.slice(1);
    }
  }

  return linhas;
}

function detectarDelimitador(texto: string): string {
  const amostra = texto.slice(0, 5000);
  const candidatos = [";", ",", "\t"];

  let melhor = ";";
  let maiorQuantidade = 0;

  for (const candidato of candidatos) {
    const quantidade = contarForaDeAspas(amostra, candidato);

    if (quantidade > maiorQuantidade) {
      maiorQuantidade = quantidade;
      melhor = candidato;
    }
  }

  return melhor;
}

function contarForaDeAspas(texto: string, delimitador: string): number {
  let contagem = 0;
  let dentroDeAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];

    if (caractere === '"') {
      if (dentroDeAspas && texto[indice + 1] === '"') {
        indice += 1;
      } else {
        dentroDeAspas = !dentroDeAspas;
      }
    } else if (caractere === delimitador && !dentroDeAspas) {
      contagem += 1;
    }
  }

  return contagem;
}

function lerLinhasCsv(texto: string, delimitador: string): string[][] {
  const linhas: string[][] = [];
  let linhaAtual: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];

    if (dentroDeAspas) {
      if (caractere === '"') {
        if (texto[indice + 1] === '"') {
          campo += '"';
          indice += 1;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += caractere;
      }

      continue;
    }

    if (caractere === '"' && campo.trim() === "") {
      campo = "";
      dentroDeAspas = true;
    } else if (caractere === delimitador) {
      linhaAtual.push(campo);
      campo = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && texto[indice + 1] === "\n") {
        indice += 1;
      }

      linhaAtual.push(campo);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campo = "";
    } else {
      campo += caractere;
    }
  }

  if (campo.length > 0 || linhaAtual.length > 0) {
    linhaAtual.push(campo);
    linhas.push(linhaAtual);
  }

  return linhas.filter((linha) => linha.some((celula) => celula.trim() !== ""));
}
