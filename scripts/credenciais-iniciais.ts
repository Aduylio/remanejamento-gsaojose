import "dotenv/config";

import { PrismaClient } from "@prisma/client";

import { gerarSenhaInicial } from "../src/lib/auth/senha-inicial";

const prisma = new PrismaClient();

/**
 * Utilitário operacional. Não é executado no build nem no seed.
 *
 * Imprime no terminal apenas as credenciais provisórias das filiais que
 * ainda não tiveram a senha trocada. Não grava nada em log persistente e
 * não expõe senhas por HTTP. Rode manualmente em ambiente controlado:
 *
 *   CONFIRMAR_EXIBICAO=1 npm run credenciais:iniciais
 */
async function main(): Promise<void> {
  if (process.env.CONFIRMAR_EXIBICAO !== "1") {
    console.error(
      "Defina CONFIRMAR_EXIBICAO=1 para exibir as credenciais provisórias no terminal.",
    );
    process.exitCode = 1;
    return;
  }

  const filiais = await prisma.filial.findMany({
    where: { ativo: true, precisaTrocarSenha: true },
    orderBy: { numero: "asc" },
    select: { id: true, nome: true, cnpj: true, senhaHash: true },
  });

  if (filiais.length === 0) {
    console.info("Nenhuma filial com credencial provisória pendente.");
    return;
  }

  console.info(
    "Credenciais provisórias (troca obrigatória no primeiro acesso):",
  );
  for (const filial of filiais) {
    if (!filial.senhaHash) {
      console.warn(
        `${filial.id} (${filial.nome}): pendente de configuração — sem CNPJ válido ou sem hash.`,
      );
      continue;
    }
    console.info(
      `${filial.id} (${filial.nome}): ${gerarSenhaInicial(filial.nome, filial.cnpj)}`,
    );
  }
}

main()
  .catch((erro) => {
    console.error("Falha ao gerar credenciais iniciais:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
