import type { ItemRemanejamento, Remanejamento } from "@/lib/types";

/**
 * Dados fictícios para demonstração da interface.
 * Produtos, EANs, pessoas e movimentações não representam dados reais.
 */
function item(
  id: string,
  nome: string,
  ean: string | undefined,
  quantidade: number,
  separado = false,
): ItemRemanejamento {
  return { id, nome, ean, quantidade, separado };
}

export function criarRemanejamentosDemo(): Remanejamento[] {
  return [
    {
      id: "rem-2026-0001",
      numero: "REM-2026-0001",
      lojaOrigemId: "loja-02",
      destinos: [
        {
          lojaId: "loja-05",
          itens: [
            item(
              "rem-2026-0001-05-01",
              "Analgésico em comprimidos — 20 un.",
              "2000000000011",
              4,
            ),
            item(
              "rem-2026-0001-05-02",
              "Soro fisiológico 0,9% — 250 ml",
              "2000000000012",
              6,
            ),
          ],
        },
        {
          lojaId: "loja-07",
          itens: [
            item(
              "rem-2026-0001-07-01",
              "Protetor solar facial FPS 50 — 50 g",
              "2000000000013",
              3,
            ),
            item(
              "rem-2026-0001-07-02",
              "Soro fisiológico 0,9% — 250 ml",
              "2000000000012",
              2,
            ),
          ],
        },
      ],
      observacoes:
        "Priorizar os itens com validade mais próxima. Conferir lote antes de separar.",
      criadoEm: "2026-10-24T08:40:00-03:00",
      status: "pendente",
    },
    {
      id: "rem-2026-0002",
      numero: "REM-2026-0002",
      lojaOrigemId: "loja-01",
      destinos: [
        {
          lojaId: "loja-03",
          itens: [
            item(
              "rem-2026-0002-03-01",
              "Termômetro digital",
              undefined,
              2,
            ),
            item(
              "rem-2026-0002-03-02",
              "Álcool em gel 70% — 100 ml",
              "2000000000014",
              5,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-25T10:15:00-03:00",
      status: "pendente",
    },
    {
      id: "rem-2026-0003",
      numero: "REM-2026-0003",
      lojaOrigemId: "loja-04",
      destinos: [
        {
          lojaId: "loja-09",
          itens: [
            item(
              "rem-2026-0003-09-01",
              "Creme hidratante corporal — 200 ml",
              "2000000000015",
              3,
              true,
            ),
            item(
              "rem-2026-0003-09-02",
              "Curativo adesivo — 20 un.",
              "2000000000016",
              4,
            ),
          ],
        },
        {
          lojaId: "loja-11",
          itens: [
            item(
              "rem-2026-0003-11-01",
              "Escova dental macia — 2 un.",
              "2000000000017",
              6,
              true,
            ),
            item(
              "rem-2026-0003-11-02",
              "Máscara facial descartável — 10 un.",
              "2000000000018",
              2,
            ),
            item(
              "rem-2026-0003-11-03",
              "Creme hidratante corporal — 200 ml",
              "2000000000015",
              1,
            ),
          ],
        },
      ],
      observacoes: "Separar os itens da Loja 09 antes dos itens da Loja 11.",
      criadoEm: "2026-10-23T14:20:00-03:00",
      status: "em_separacao",
      iniciadoEm: "2026-10-25T09:05:00-03:00",
    },
    {
      id: "rem-2026-0004",
      numero: "REM-2026-0004",
      lojaOrigemId: "loja-06",
      destinos: [
        {
          lojaId: "loja-02",
          itens: [
            item(
              "rem-2026-0004-02-01",
              "Fralda descartável tamanho M — 20 un.",
              "2000000000019",
              3,
              true,
            ),
            item(
              "rem-2026-0004-02-02",
              "Suplemento vitamínico — 30 cápsulas",
              "2000000000020",
              2,
              true,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-22T11:30:00-03:00",
      status: "separada",
      responsavelSeparacao: "Carla Menezes",
      iniciadoEm: "2026-10-22T13:10:00-03:00",
      separadoEm: "2026-10-23T08:45:00-03:00",
    },
    {
      id: "rem-2026-0005",
      numero: "REM-2026-0005",
      lojaOrigemId: "loja-03",
      destinos: [
        {
          lojaId: "loja-01",
          itens: [
            item(
              "rem-2026-0005-01-01",
              "Xarope infantil — 120 ml",
              "2000000000021",
              4,
            ),
          ],
        },
        {
          lojaId: "loja-08",
          itens: [
            item(
              "rem-2026-0005-08-01",
              "Xarope infantil — 120 ml",
              "2000000000021",
              2,
            ),
            item(
              "rem-2026-0005-08-02",
              "Protetor solar facial FPS 50 — 50 g",
              "2000000000013",
              3,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-26T07:50:00-03:00",
      status: "pendente",
    },
    {
      id: "rem-2026-0006",
      numero: "REM-2026-0006",
      lojaOrigemId: "loja-08",
      destinos: [
        {
          lojaId: "loja-04",
          itens: [
            item(
              "rem-2026-0006-04-01",
              "Analgésico em comprimidos — 20 un.",
              "2000000000011",
              8,
              true,
            ),
            item(
              "rem-2026-0006-04-02",
              "Curativo adesivo — 20 un.",
              "2000000000016",
              3,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-25T16:10:00-03:00",
      status: "em_separacao",
      iniciadoEm: "2026-10-26T08:20:00-03:00",
    },
    {
      id: "rem-2026-0007",
      numero: "REM-2026-0007",
      lojaOrigemId: "loja-10",
      destinos: [
        {
          lojaId: "loja-06",
          itens: [
            item(
              "rem-2026-0007-06-01",
              "Álcool em gel 70% — 100 ml",
              "2000000000014",
              6,
              true,
            ),
          ],
        },
        {
          lojaId: "loja-02",
          itens: [
            item(
              "rem-2026-0007-02-01",
              "Máscara facial descartável — 10 un.",
              "2000000000018",
              4,
              true,
            ),
            item(
              "rem-2026-0007-02-02",
              "Termômetro digital",
              undefined,
              1,
              true,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-21T09:00:00-03:00",
      status: "separada",
      responsavelSeparacao: "Rafael Souza",
      iniciadoEm: "2026-10-22T08:15:00-03:00",
      separadoEm: "2026-10-22T15:40:00-03:00",
    },
    {
      id: "rem-2026-0008",
      numero: "REM-2026-0008",
      lojaOrigemId: "loja-05",
      destinos: [
        {
          lojaId: "loja-11",
          itens: [
            item(
              "rem-2026-0008-11-01",
              "Soro fisiológico 0,9% — 250 ml",
              "2000000000012",
              10,
            ),
            item(
              "rem-2026-0008-11-02",
              "Fralda descartável tamanho M — 20 un.",
              "2000000000019",
              4,
            ),
          ],
        },
      ],
      observacoes: "Caixa com 14 unidades. Conferir a contagem na conferência final.",
      criadoEm: "2026-10-26T08:35:00-03:00",
      status: "pendente",
    },
    {
      id: "rem-2026-0009",
      numero: "REM-2026-0009",
      lojaOrigemId: "loja-07",
      destinos: [
        {
          lojaId: "loja-03",
          itens: [
            item(
              "rem-2026-0009-03-01",
              "Protetor solar facial FPS 50 — 50 g",
              "2000000000013",
              4,
              true,
            ),
          ],
        },
        {
          lojaId: "loja-10",
          itens: [
            item(
              "rem-2026-0009-10-01",
              "Creme hidratante corporal — 200 ml",
              "2000000000015",
              5,
              true,
            ),
            item(
              "rem-2026-0009-10-02",
              "Escova dental macia — 2 un.",
              "2000000000017",
              2,
              true,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-20T15:25:00-03:00",
      status: "separada",
      responsavelSeparacao: "Juliana Prado",
      iniciadoEm: "2026-10-21T08:00:00-03:00",
      separadoEm: "2026-10-21T10:20:00-03:00",
    },
    {
      id: "rem-2026-0010",
      numero: "REM-2026-0010",
      lojaOrigemId: "loja-09",
      destinos: [
        {
          lojaId: "loja-01",
          itens: [
            item(
              "rem-2026-0010-01-01",
              "Suplemento vitamínico — 30 cápsulas",
              "2000000000020",
              3,
              true,
            ),
            item(
              "rem-2026-0010-01-02",
              "Álcool em gel 70% — 100 ml",
              "2000000000014",
              4,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-26T09:10:00-03:00",
      status: "em_separacao",
      iniciadoEm: "2026-10-26T09:55:00-03:00",
    },
    {
      id: "rem-2026-0011",
      numero: "REM-2026-0011",
      lojaOrigemId: "loja-11",
      destinos: [
        {
          lojaId: "loja-08",
          itens: [
            item(
              "rem-2026-0011-08-01",
              "Curativo adesivo — 20 un.",
              "2000000000016",
              5,
            ),
            item(
              "rem-2026-0011-08-02",
              "Termômetro digital",
              undefined,
              2,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-23T17:45:00-03:00",
      status: "pendente",
    },
    {
      id: "rem-2026-0012",
      numero: "REM-2026-0012",
      lojaOrigemId: "loja-02",
      destinos: [
        {
          lojaId: "loja-06",
          itens: [
            item(
              "rem-2026-0012-06-01",
              "Fralda descartável tamanho M — 20 un.",
              "2000000000019",
              2,
              true,
            ),
          ],
        },
      ],
      criadoEm: "2026-10-19T12:00:00-03:00",
      status: "separada",
      responsavelSeparacao: "Marcos Vinícius",
      iniciadoEm: "2026-10-20T08:10:00-03:00",
      separadoEm: "2026-10-20T09:00:00-03:00",
    },
  ];
}
