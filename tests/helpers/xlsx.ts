import { Buffer } from "node:buffer";

/**
 * Gera um .xlsx mínimo (ZIP sem compressão + XML do Office Open XML) para
 * testar a leitura real de planilhas sem adicionar uma dependência de escrita.
 */

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256);

  for (let indice = 0; indice < 256; indice += 1) {
    let valor = indice;

    for (let bit = 0; bit < 8; bit += 1) {
      valor = valor & 1 ? 0xedb88320 ^ (valor >>> 1) : valor >>> 1;
    }

    tabela[indice] = valor >>> 0;
  }

  return tabela;
})();

function crc32(dados: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of dados) {
    crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

interface ArquivoZip {
  nome: string;
  conteudo: Buffer;
}

function criarZip(arquivos: ArquivoZip[]): Buffer {
  const partesLocais: Buffer[] = [];
  const partesCentrais: Buffer[] = [];
  let deslocamento = 0;

  for (const arquivo of arquivos) {
    const nome = Buffer.from(arquivo.nome, "utf8");
    const dados = arquivo.conteudo;
    const crc = crc32(dados);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dados.length, 18);
    local.writeUInt32LE(dados.length, 22);
    local.writeUInt16LE(nome.length, 26);
    local.writeUInt16LE(0, 28);
    partesLocais.push(local, nome, dados);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(dados.length, 20);
    central.writeUInt32LE(dados.length, 24);
    central.writeUInt16LE(nome.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(deslocamento, 42);
    partesCentrais.push(central, nome);

    deslocamento += local.length + nome.length + dados.length;
  }

  const diretorioCentral = Buffer.concat(partesCentrais);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0);
  fim.writeUInt16LE(0, 4);
  fim.writeUInt16LE(0, 6);
  fim.writeUInt16LE(arquivos.length, 8);
  fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(diretorioCentral.length, 12);
  fim.writeUInt32LE(deslocamento, 16);
  fim.writeUInt16LE(0, 20);

  return Buffer.concat([...partesLocais, diretorioCentral, fim]);
}

function escaparXml(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coluna(indice: number): string {
  let letra = "";
  let numero = indice + 1;

  while (numero > 0) {
    const resto = (numero - 1) % 26;
    letra = String.fromCharCode(65 + resto) + letra;
    numero = Math.floor((numero - 1) / 26);
  }

  return letra;
}

function criarSheet(linhas: string[][]): string {
  const corpo = linhas
    .map((linha, indiceLinha) => {
      const celulas = linha
        .map(
          (valor, indiceColuna) =>
            `<c r="${coluna(indiceColuna)}${indiceLinha + 1}" t="inlineStr"><is><t>${escaparXml(valor)}</t></is></c>`,
        )
        .join("");

      return `<row r="${indiceLinha + 1}">${celulas}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${corpo}</sheetData></worksheet>`;
}

export function gerarXlsx(linhas: string[][]): Buffer {
  const arquivos: ArquivoZip[] = [
    {
      nome: "[Content_Types].xml",
      conteudo: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      ),
    },
    {
      nome: "_rels/.rels",
      conteudo: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
    },
    {
      nome: "xl/workbook.xml",
      conteudo: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pedido" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
    },
    {
      nome: "xl/_rels/workbook.xml.rels",
      conteudo: Buffer.from(
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
    },
    {
      nome: "xl/worksheets/sheet1.xml",
      conteudo: Buffer.from(criarSheet(linhas)),
    },
  ];

  return criarZip(arquivos);
}
