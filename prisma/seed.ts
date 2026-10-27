import "dotenv/config";

import bcrypt from "bcryptjs";
import { PapelUsuario, PrismaClient } from "@prisma/client";

import { gerarSenhaFixaPorLojaId } from "../src/lib/auth/senha-inicial";
import { precisaConfigurarSenha } from "../src/lib/auth/permissoes";
import { LOJAS } from "../src/data/lojas";

const prisma = new PrismaClient();

const PAPEIS = new Set<string>(Object.values(PapelUsuario));
const FORMATO_HASH_SCRYPT = /^scrypt\$[^$]+\$[a-f0-9]{32,}$/i;

async function seedFiliais(): Promise<void> {
  const resultado = await prisma.filial.createMany({
    data: LOJAS.map((loja) => ({
      id: loja.id,
      numero: loja.numero,
      nome: loja.nome,
      cnpj: loja.cnpj,
    })),
    skipDuplicates: true,
  });

  const total = await prisma.filial.count();
  const existentes = total - resultado.count;

  console.info(
    `Filiais: ${resultado.count} criada(s), ${existentes} já existente(s), ${total} no total.`,
  );

  const cadastradas = await prisma.filial.findMany({
    select: { id: true, numero: true, nome: true, cnpj: true },
  });
  const porId = new Map(cadastradas.map((filial) => [filial.id, filial]));

  for (const loja of LOJAS) {
    const cadastrada = porId.get(loja.id);

    if (!cadastrada) {
      console.warn(
        `Atenção: a filial ${loja.id} não pôde ser cadastrada porque o número ${loja.numero} ou o CNPJ ${loja.cnpj} já pertence a outro registro.`,
      );
      continue;
    }

    if (
      cadastrada.numero !== loja.numero ||
      cadastrada.nome !== loja.nome ||
      cadastrada.cnpj !== loja.cnpj
    ) {
      console.warn(
        `Atenção: a filial ${loja.id} já existia com dados diferentes dos definidos em src/data/lojas.ts. O registro existente foi preservado.`,
      );
    }
  }
}

async function seedSenhasFiliais(): Promise<void> {
  const filiais = await prisma.filial.findMany({
    select: { id: true, nome: true, cnpj: true, senhaHash: true },
  });

  let criadas = 0;
  let atualizadas = 0;
  let pendentes = 0;

  for (const filial of filiais) {
    if (!filial.cnpj || filial.cnpj.replace(/\D/g, "").length !== 14) {
      pendentes += 1;
      console.warn(
        `Senhas filiais: CNPJ ausente/inválido para ${filial.id} (${filial.nome}). Defina manualmente antes de liberar.`,
      );
      continue;
    }

    const senhaFixa = gerarSenhaFixaPorLojaId(filial.id);
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(senhaFixa, salt);

    if (precisaConfigurarSenha(filial.senhaHash)) {
      await prisma.filial.update({
        where: { id: filial.id },
        data: {
          senhaHash: hash,
          precisaTrocarSenha: false,
        },
      });
      criadas += 1;
      continue;
    }

    // Atualiza para senha fixa quando já existir hash, mantendo idempotência
    await prisma.filial.update({
      where: { id: filial.id },
      data: {
        senhaHash: hash,
        precisaTrocarSenha: false,
      },
    });
    atualizadas += 1;
    // Não logar senhas
  }

  console.info(
    `Senhas filiais: ${criadas} configurada(s) com senha fixa SAOJOSExx, ${atualizadas} atualizada(s) para senha fixa, ${pendentes} com pendência (CNPJ).`,
  );
}

async function seedUsuarioOpcional(): Promise<void> {
  const nome = process.env.SEED_USUARIO_NOME?.trim();
  const login = process.env.SEED_USUARIO_LOGIN?.trim();
  const senhaHash = process.env.SEED_USUARIO_SENHA_HASH?.trim();
  const papel = process.env.SEED_USUARIO_PAPEL?.trim();
  const filialId = process.env.SEED_USUARIO_FILIAL_ID?.trim() || null;

  if (!nome && !login && !senhaHash && !papel && !filialId) {
    console.info(
      "Usuários: nenhum usuário inicial configurado. Defina SEED_USUARIO_NOME, SEED_USUARIO_LOGIN, SEED_USUARIO_SENHA_HASH e SEED_USUARIO_PAPEL para criar um usuário sem senha padrão.",
    );
    return;
  }

  const ausentes = [
    !nome && "SEED_USUARIO_NOME",
    !login && "SEED_USUARIO_LOGIN",
    !senhaHash && "SEED_USUARIO_SENHA_HASH",
    !papel && "SEED_USUARIO_PAPEL",
  ].filter(Boolean);

  if (ausentes.length > 0) {
    console.warn(
      `Usuários: seed ignorado. Informe também: ${ausentes.join(", ")}.`,
    );
    return;
  }

  if (!papel || !PAPEIS.has(papel)) {
    console.warn(
      `Usuários: seed ignorado. SEED_USUARIO_PAPEL deve ser um de: ${[...PAPEIS].join(", ")}.`,
    );
    return;
  }

  if (!senhaHash || !FORMATO_HASH_SCRYPT.test(senhaHash)) {
    console.warn(
      "Usuários: seed ignorado. SEED_USUARIO_SENHA_HASH deve estar no formato scrypt$salt$hash. Nenhuma senha em texto puro é aceita.",
    );
    return;
  }

  if (papel === PapelUsuario.filial && !filialId) {
    console.warn(
      "Usuários: seed ignorado. Usuários com papel filial exigem SEED_USUARIO_FILIAL_ID.",
    );
    return;
  }

  if (filialId) {
    const filial = await prisma.filial.findUnique({ where: { id: filialId } });

    if (!filial) {
      console.warn(
        `Usuários: seed ignorado. A filial ${filialId} não existe no banco.`,
      );
      return;
    }
  }

  const existente = await prisma.usuario.findUnique({
    where: { login: login as string },
    select: { id: true },
  });

  if (existente) {
    console.info(
      `Usuários: o login "${login}" já existe e foi preservado sem alteração.`,
    );
    return;
  }

  await prisma.usuario.create({
    data: {
      nome: nome as string,
      login: login as string,
      senhaHash,
      papel: papel as PapelUsuario,
      filialId,
    },
  });

  console.info(`Usuários: usuário "${login}" criado.`);
}

async function main(): Promise<void> {
  await seedFiliais();
  await seedSenhasFiliais();
  await seedUsuarioOpcional();
}

main()
  .catch((erro) => {
    console.error("Falha ao executar o seed:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
