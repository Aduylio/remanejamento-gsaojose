import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { analisarCsv, analisarLinhas } from "@/lib/importacao/analisador";
import { confirmarImportacao } from "@/lib/importacao/confirmacao";
import { gerarRemanejamentosDaImportacao } from "@/lib/importacao/gerador";
import { ErroPlanilha, lerPlanilha, validarNomeArquivo } from "@/lib/importacao/planilha";
import { criarRepositorioRemanejamentosEmMemoria } from "@/lib/importacao/repositorio";
import type {
  OpcoesAnaliseImportacao,
  PreviewImportacao,
} from "@/lib/importacao/tipos";
import type { LojaId } from "@/lib/types";

import { gerarXlsx } from "./helpers/xlsx";

const CONTEUDO_FIXTURE = readFileSync(
  fileURLToPath(new URL("./fixtures/pedido-agrupado.csv", import.meta.url)),
  "utf8",
);

function opcoes(
  lojaOrigemId: LojaId = "loja-03",
  importacaoId = "imp-teste-1",
): OpcoesAnaliseImportacao {
  return {
    lojaOrigemId,
    arquivo: "pedido-agrupado.csv",
    importacaoId,
    referencia: "IMP-20260313-TEST",
    criadoEm: "2026-03-13T12:00:00.000Z",
  };
}

function bloco(
  pedido: string,
  cnpj: string,
  produtos: Array<[string, string, string, string, string]>,
): string[] {
  return [
    "Pedido;Data Pedido;Fornecedor;CNPJ Filial;Nome Filial",
    `${pedido};01/01/2026;Fornecedor Teste;${cnpj};Filial do arquivo`,
    "Código Reduzido;EAN Principal;Descrição;Quantidade;Laboratório",
    ...produtos.map((produto) => produto.join(";")),
  ];
}

function csv(linhas: string[]): string {
  return linhas.join("\n");
}

function analisarFixture(lojaOrigemId: LojaId = "loja-03") {
  return analisarCsv(CONTEUDO_FIXTURE, opcoes(lojaOrigemId));
}

function confirmar(
  preview: PreviewImportacao,
  repositorio: ReturnType<typeof criarRepositorioRemanejamentosEmMemoria>,
  estado: { confirmada: boolean },
) {
  return confirmarImportacao({
    preview,
    jaConfirmada: estado.confirmada,
    repositorio,
    marcarConfirmada: () => {
      estado.confirmada = true;
    },
  });
}

describe("mapeamento de filiais por CNPJ", () => {
  it("mapeia os destinos pelo CNPJ normalizado oficial, inclusive com zeros à esquerda", () => {
    const { preview } = analisarFixture("loja-03");
    const destinos = preview.destinos.map((destino) => ({
      lojaId: destino.lojaId,
      cnpj: destino.cnpj,
      nome: destino.nome,
    }));

    expect(destinos).toEqual([
      {
        lojaId: "loja-02",
        cnpj: "10846217000251",
        nome: "Atacadão Tabuleiro",
      },
      {
        lojaId: "loja-05",
        cnpj: "10846217000502",
        nome: "Original Filial Russas",
      },
    ]);

    const { preview: comZeroAEsquerda } = analisarCsv(
      csv(
        bloco("900", "08.463.473/0001-37", [
          ["1", "7891000056523", "Produto", "2", "Lab"],
        ]),
      ),
      opcoes("loja-02", "imp-zero"),
    );

    expect(comZeroAEsquerda.destinos[0]?.lojaId).toBe("loja-11");
    expect(comZeroAEsquerda.destinos[0]?.cnpj).toBe("08463473000137");
  });

  it("bloqueia CNPJ desconhecido ou com quantidade de dígitos inválida", () => {
    const desconhecido = analisarCsv(
      csv([
        ...bloco("901", "11.111.111/1111-11", [
          ["1", "7891000056523", "Produto", "2", "Lab"],
        ]),
        ...bloco("902", "10.846.217/0005-2", [
          ["2", "7891000056530", "Outro produto", "1", "Lab"],
        ]),
      ]),
      opcoes("loja-03", "imp-desconhecido"),
    );

    const codigos = desconhecido.preview.erros.map((erro) => erro.codigo);

    expect(codigos).toContain("cnpj_desconhecido");
    expect(codigos).toContain("cnpj_invalido");
    expect(desconhecido.preview.destinos).toHaveLength(0);
    expect(desconhecido.preview.podeConfirmar).toBe(false);
  });
});

describe("origem, destinos e quantidades", () => {
  it("mantém os itens da loja de origem na origem e não cria autotransferência", () => {
    const { preview } = analisarFixture("loja-03");
    const gerados = gerarRemanejamentosDaImportacao(preview);

    expect(preview.destinos.some((destino) => destino.lojaId === "loja-03")).toBe(
      false,
    );
    expect(preview.itensOrigem).toHaveLength(3);
    expect(preview.resumo.produtosNaOrigem).toBe(3);
    expect(preview.resumo.unidadesNaOrigem).toBe(11);
    expect(
      preview.itensOrigem.every((item) => item.cnpjFilial === "10846217000332"),
    ).toBe(true);
    expect(
      gerados.every(
        (remanejamento) =>
          remanejamento.lojaOrigemId === "loja-03" &&
          remanejamento.destinos.every(
            (destino) => destino.lojaId !== remanejamento.lojaOrigemId,
          ),
      ),
    ).toBe(true);
    expect(gerados).toHaveLength(2);
  });

  it("preserva as quantidades e as linhas repetidas sem consolidar o mesmo EAN", () => {
    const { preview } = analisarFixture("loja-03");
    const loja05 = preview.destinos.find(
      (destino) => destino.lojaId === "loja-05",
    );
    const loja02 = preview.destinos.find(
      (destino) => destino.lojaId === "loja-02",
    );

    expect(loja05?.itens).toHaveLength(3);
    expect(loja05?.totalUnidades).toBe(12);
    expect(loja02?.itens).toHaveLength(2);
    expect(loja02?.totalUnidades).toBe(14);

    const dipironaOrigem = preview.itensOrigem.filter(
      (item) => item.ean === "7891000056523",
    );
    const dipironaLoja05 = loja05?.itens.filter(
      (item) => item.ean === "7891000056523",
    );
    const dipironaLoja02 = loja02?.itens.filter(
      (item) => item.ean === "7891000056523",
    );

    expect(dipironaOrigem.map((item) => item.quantidade)).toEqual([4, 1]);
    expect(dipironaLoja05?.map((item) => item.quantidade)).toEqual([7, 2]);
    expect(dipironaLoja02?.map((item) => item.quantidade)).toEqual([9]);
    expect(dipironaLoja05?.[1]?.repetidoNoPedido).toBe(true);
    expect(preview.avisos.map((aviso) => aviso.codigo)).toContain(
      "produto_repetido_no_pedido",
    );
  });

  it("lê EAN em fórmula do Excel e preserva zeros à esquerda", () => {
    const { preview } = analisarCsv(
      csv(
        bloco("903", "10.846.217/0005-02", [
          ["10", '="7891000056523"', "Produto com fórmula", "2", "Lab"],
          ["11", '="0123456789012"', "Produto com zero à esquerda", "3", "Lab"],
        ]),
      ),
      opcoes("loja-03", "imp-ean"),
    );

    expect(preview.destinos[0]?.itens[0]?.ean).toBe("7891000056523");
    expect(preview.destinos[0]?.itens[1]?.ean).toBe("0123456789012");
    expect(preview.podeConfirmar).toBe(true);
  });

  it("trata linhas em branco, BOM e campos entre aspas com ponto e vírgula", () => {
    const conteudo = `\uFEFF${csv([
      "",
      "Pedido;Data Pedido;Fornecedor;CNPJ Filial;Nome Filial",
      "904;01/01/2026;Fornecedor Teste;10.846.217/0005-02;Filial",
      "",
      "Código Reduzido;EAN Principal;Descrição;Quantidade;Laboratório",
      '20;7891000056523;"Produto; especial";2;Lab',
      "",
    ])}`;
    const { preview } = analisarCsv(conteudo, opcoes("loja-03", "imp-branco"));

    expect(preview.erros).toEqual([]);
    expect(preview.destinos[0]?.itens).toHaveLength(1);
    expect(preview.destinos[0]?.itens[0]?.descricao).toBe("Produto; especial");
    expect(preview.resumo.blocosProcessados).toBe(1);
  });
});

describe("estruturas incompletas e quantidades inválidas", () => {
  it("sinaliza bloco de pedido sem produtos sem impedir os demais destinos válidos", () => {
    const conteudo = csv([
      "Pedido;Data Pedido;Fornecedor;CNPJ Filial;Nome Filial",
      "905;01/01/2026;Fornecedor Teste;10.846.217/0004-13;Atacadão Russas",
      "",
      ...bloco("906", "10.846.217/0005-02", [
        ["1", "7891000056523", "Produto", "2", "Lab"],
      ]),
    ]);
    const { preview } = analisarCsv(conteudo, opcoes("loja-03", "imp-sem-prod"));

    expect(preview.erros).toEqual([]);
    expect(preview.avisos.map((aviso) => aviso.codigo)).toContain(
      "pedido_sem_produtos",
    );
    expect(preview.destinos.map((destino) => destino.lojaId)).toEqual([
      "loja-05",
    ]);
    expect(preview.podeConfirmar).toBe(true);
  });

  it("bloqueia produtos que aparecem sem um bloco de pedido válido", () => {
    const conteudo = csv([
      "Código Reduzido;EAN Principal;Descrição;Quantidade;Laboratório",
      "1;7891000056523;Produto solto;2;Lab",
    ]);
    const { preview } = analisarCsv(conteudo, opcoes("loja-03", "imp-sem-bloco"));

    expect(preview.erros.map((erro) => erro.codigo)).toContain(
      "produtos_sem_bloco",
    );
    expect(preview.destinos).toHaveLength(0);
    expect(preview.podeConfirmar).toBe(false);
  });

  it("rejeita quantidades negativas, zero, fracionadas, vazias ou não numéricas", () => {
    const conteudo = csv(
      bloco("907", "10.846.217/0005-02", [
        ["1", "7891000056523", "Negativa", "-2", "Lab"],
        ["2", "7891000056530", "Zero", "0", "Lab"],
        ["3", "7891000056547", "Fracionada", "2,5", "Lab"],
        ["4", "7891000056554", "Texto", "abc", "Lab"],
        ["5", "7891000056561", "Vazia", "", "Lab"],
      ]),
    );
    const { preview } = analisarCsv(conteudo, opcoes("loja-03", "imp-qtd"));

    const invalidas = preview.erros.filter(
      (erro) => erro.codigo === "quantidade_invalida",
    );

    expect(invalidas.length).toBeGreaterThanOrEqual(5);
    expect(preview.erros.map((erro) => erro.codigo)).toContain(
      "sem_produtos_validos",
    );
    expect(preview.podeConfirmar).toBe(false);
  });

  it("bloqueia uma importação que só possui itens da própria origem", () => {
    const conteudo = csv(
      bloco("908", "10.846.217/0003-32", [
        ["1", "7891000056523", "Produto da origem", "4", "Lab"],
      ]),
    );
    const { preview } = analisarCsv(conteudo, opcoes("loja-03", "imp-origem"));

    expect(preview.destinos).toHaveLength(0);
    expect(preview.avisos.map((aviso) => aviso.codigo)).toContain(
      "sem_destinos",
    );
    expect(preview.podeConfirmar).toBe(false);

    const repositorio = criarRepositorioRemanejamentosEmMemoria();
    const resultado = confirmar(preview, repositorio, { confirmada: false });

    expect(resultado.status).toBe("invalida");
    expect(repositorio.listar()).toHaveLength(0);
  });
});

describe("confirmação, idempotência e persistência", () => {
  it("não grava nada antes da confirmação", () => {
    const repositorio = criarRepositorioRemanejamentosEmMemoria();
    const { preview } = analisarFixture("loja-03");

    expect(preview.podeConfirmar).toBe(true);
    expect(repositorio.listar()).toHaveLength(0);
  });

  it("confirma criando um remanejamento por destino com os metadados do pedido", () => {
    const repositorio = criarRepositorioRemanejamentosEmMemoria();
    const estado = { confirmada: false };
    const { preview } = analisarFixture("loja-03");
    const resultado = confirmar(preview, repositorio, estado);

    expect(resultado.status).toBe("confirmada");
    expect(estado.confirmada).toBe(true);
    expect(repositorio.listar()).toHaveLength(2);

    const loja05 = repositorio
      .listar()
      .find((remanejamento) => remanejamento.destinos[0]?.lojaId === "loja-05");

    expect(loja05).toBeDefined();
    expect(loja05?.lojaOrigemId).toBe("loja-03");
    expect(loja05?.importacao?.arquivo).toBe("pedido-agrupado.csv");
    expect(loja05?.importacao?.referencia).toBe("IMP-20260313-TEST");
    expect(loja05?.importacao?.cnpjFilial).toBe("10846217000502");
    expect(loja05?.pedidoNumero).toBe("88422");
    expect(loja05?.fornecedor).toBe("Distribuidora Beta S.A.");
    expect(
      loja05?.destinos[0]?.itens.every(
        (item) =>
          item.pedidoNumero === "88422" &&
          item.pedidoData === "12/03/2026" &&
          item.cnpjFilial === "10846217000502" &&
          item.linhaImportada !== undefined,
      ),
    ).toBe(true);
  });

  it("impede confirmação duplicada e não cria registros extras", () => {
    const repositorio = criarRepositorioRemanejamentosEmMemoria();
    const estado = { confirmada: false };
    const { preview } = analisarFixture("loja-03");

    const primeira = confirmar(preview, repositorio, estado);
    const segunda = confirmar(preview, repositorio, estado);

    expect(primeira.status).toBe("confirmada");
    expect(segunda.status).toBe("duplicada");
    expect(repositorio.listar()).toHaveLength(2);
  });

  it("revalida no servidor e rejeita prévia adulterada sem gravar", () => {
    const repositorio = criarRepositorioRemanejamentosEmMemoria();
    const estado = { confirmada: false };
    const { preview } = analisarFixture("loja-03");
    const adulterada: PreviewImportacao = {
      ...preview,
      destinos: preview.destinos.map((destino, indice) =>
        indice === 0
          ? {
              ...destino,
              lojaId: preview.lojaOrigemId,
            }
          : destino,
      ),
    };

    const resultado = confirmar(adulterada, repositorio, estado);

    expect(resultado.status).toBe("invalida");
    expect(estado.confirmada).toBe(false);
    expect(repositorio.listar()).toHaveLength(0);
  });

  it("não cria registros parciais quando a persistência falha", () => {
    const repositorio = criarRepositorioRemanejamentosEmMemoria({
      falharAoGravar: true,
    });
    const estado = { confirmada: false };
    const { preview } = analisarFixture("loja-03");
    const resultado = confirmar(preview, repositorio, estado);

    expect(resultado.status).toBe("falha");
    expect(estado.confirmada).toBe(false);
    expect(repositorio.listar()).toHaveLength(0);

    const repositorioSaudavel = criarRepositorioRemanejamentosEmMemoria();
    const novaTentativa = confirmar(preview, repositorioSaudavel, estado);

    expect(novaTentativa.status).toBe("confirmada");
    expect(repositorioSaudavel.listar()).toHaveLength(2);
  });
});

describe("leitura de arquivos", () => {
  it("rejeita .xls e formatos não suportados com mensagem clara", async () => {
    expect(() => validarNomeArquivo("pedido.xls")).toThrow(ErroPlanilha);
    await expect(
      lerPlanilha("pedido.pdf", Buffer.from("conteudo")),
    ).rejects.toMatchObject({ codigo: "formato_invalido" });
    await expect(
      lerPlanilha("pedido.xls", Buffer.from("conteudo")),
    ).rejects.toMatchObject({ codigo: "formato_xls" });
  });

  it("decodifica CSV em Windows-1252 quando não for UTF-8 válido", async () => {
    const conteudo = Buffer.from(
      csv(
        bloco("909", "10.846.217/0005-02", [
          ["1", "7891000056523", "Descrição com acentuação", "2", "Lab"],
        ]),
      ),
      "latin1",
    );
    const planilha = await lerPlanilha("pedido.csv", conteudo);

    expect(planilha.codificacao).toBe("windows-1252");
    expect(planilha.linhas.join(" ")).toContain("Descrição com acentuação");
  });

  it("lê um arquivo .xlsx real e mantém os identificadores como texto", async () => {
    const linhas = [
      ["Pedido", "Data Pedido", "Fornecedor", "CNPJ Filial", "Nome Filial"],
      ["910", "01/01/2026", "Fornecedor XLSX", "10.846.217/0005-02", "Filial"],
      [
        "Código Reduzido",
        "EAN Principal",
        "Descrição",
        "Quantidade",
        "Laboratório",
      ],
      ["30", '="0123456789012"', "Produto XLSX", "5", "Lab"],
    ];
    const planilha = await lerPlanilha("pedido.xlsx", gerarXlsx(linhas));

    expect(planilha.extensao).toBe(".xlsx");
    expect(planilha.linhas[3]?.[1]).toBe('="0123456789012"');

    const { preview } = analisarLinhas(planilha.linhas, opcoes("loja-03", "imp-xlsx"));

    expect(preview.podeConfirmar).toBe(true);
    expect(preview.destinos[0]?.itens[0]?.ean).toBe("0123456789012");
    expect(preview.destinos[0]?.itens[0]?.quantidade).toBe(5);
  });
});
