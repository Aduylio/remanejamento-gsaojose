-- CreateEnum
CREATE TYPE "papel_usuario" AS ENUM ('comprador', 'filial', 'administrador');

-- CreateEnum
CREATE TYPE "status_remanejamento" AS ENUM ('pendente', 'em_separacao', 'separada');

-- CreateEnum
CREATE TYPE "status_importacao" AS ENUM ('pendente', 'confirmada', 'falha');

-- CreateTable
CREATE TABLE "filiais" (
    "id" VARCHAR(20) NOT NULL,
    "numero" INTEGER NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "login" VARCHAR(160) NOT NULL,
    "senha_hash" VARCHAR(255) NOT NULL,
    "papel" "papel_usuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "filial_id" VARCHAR(20),
    "ultimo_acesso_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" TEXT NOT NULL,
    "referencia" VARCHAR(80) NOT NULL,
    "arquivo" VARCHAR(255) NOT NULL,
    "status" "status_importacao" NOT NULL DEFAULT 'pendente',
    "loja_origem_fisica_id" VARCHAR(20) NOT NULL,
    "usuario_comprador_id" TEXT,
    "erros" JSONB,
    "avisos" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" TIMESTAMP(3),
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remanejamentos" (
    "id" TEXT NOT NULL,
    "numero" VARCHAR(80) NOT NULL,
    "status" "status_remanejamento" NOT NULL DEFAULT 'pendente',
    "loja_origem_id" VARCHAR(20) NOT NULL,
    "criado_por_id" TEXT,
    "importacao_id" TEXT,
    "observacoes" TEXT,
    "pedido_numero" VARCHAR(80),
    "pedido_data" VARCHAR(20),
    "fornecedor" VARCHAR(160),
    "responsavel_separacao" VARCHAR(120),
    "iniciado_em" TIMESTAMP(3),
    "separado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "remanejamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinos_remanejamento" (
    "id" TEXT NOT NULL,
    "remanejamento_id" TEXT NOT NULL,
    "loja_id" VARCHAR(20) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "destinos_remanejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_remanejamento" (
    "id" TEXT NOT NULL,
    "destino_id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "ean" VARCHAR(32),
    "quantidade" INTEGER NOT NULL,
    "separado" BOOLEAN NOT NULL DEFAULT false,
    "codigo_reduzido" VARCHAR(80),
    "laboratorio" VARCHAR(160),
    "pedido_numero" VARCHAR(80),
    "pedido_data" VARCHAR(20),
    "fornecedor" VARCHAR(160),
    "cnpj_filial" CHAR(14),
    "nome_filial_arquivo" VARCHAR(160),
    "linha_importada" INTEGER,
    "repetido_no_pedido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_remanejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_importacao" (
    "id" TEXT NOT NULL,
    "importacao_id" TEXT NOT NULL,
    "remanejamento_id" TEXT,
    "loja_destino_id" VARCHAR(20),
    "linha" INTEGER,
    "pedido_numero" VARCHAR(80),
    "pedido_data" VARCHAR(20),
    "fornecedor" VARCHAR(160),
    "cnpj_filial" CHAR(14),
    "nome_filial_arquivo" VARCHAR(160),
    "codigo_reduzido" VARCHAR(80),
    "ean" VARCHAR(32),
    "descricao" VARCHAR(255),
    "laboratorio" VARCHAR(160),
    "quantidade" INTEGER,
    "quantidade_informada" VARCHAR(80),
    "erro_quantidade" TEXT,
    "erro_identificacao" TEXT,
    "repetido_no_pedido" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_importacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contadores_numeracao" (
    "chave" VARCHAR(80) NOT NULL,
    "valor" BIGINT NOT NULL DEFAULT 0,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contadores_numeracao_pkey" PRIMARY KEY ("chave")
);

-- CreateIndex
CREATE UNIQUE INDEX "filiais_numero_key" ON "filiais"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "filiais_cnpj_key" ON "filiais"("cnpj");

-- CreateIndex
CREATE INDEX "filiais_nome_idx" ON "filiais"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_login_key" ON "usuarios"("login");

-- CreateIndex
CREATE INDEX "usuarios_papel_ativo_idx" ON "usuarios"("papel", "ativo");

-- CreateIndex
CREATE INDEX "usuarios_filial_id_idx" ON "usuarios"("filial_id");

-- CreateIndex
CREATE UNIQUE INDEX "importacoes_referencia_key" ON "importacoes"("referencia");

-- CreateIndex
CREATE INDEX "importacoes_loja_origem_fisica_id_idx" ON "importacoes"("loja_origem_fisica_id");

-- CreateIndex
CREATE INDEX "importacoes_usuario_comprador_id_idx" ON "importacoes"("usuario_comprador_id");

-- CreateIndex
CREATE INDEX "importacoes_status_criado_em_idx" ON "importacoes"("status", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "remanejamentos_numero_key" ON "remanejamentos"("numero");

-- CreateIndex
CREATE INDEX "remanejamentos_loja_origem_id_idx" ON "remanejamentos"("loja_origem_id");

-- CreateIndex
CREATE INDEX "remanejamentos_status_criado_em_idx" ON "remanejamentos"("status", "criado_em");

-- CreateIndex
CREATE INDEX "remanejamentos_criado_por_id_idx" ON "remanejamentos"("criado_por_id");

-- CreateIndex
CREATE INDEX "remanejamentos_importacao_id_idx" ON "remanejamentos"("importacao_id");

-- CreateIndex
CREATE INDEX "destinos_remanejamento_loja_id_idx" ON "destinos_remanejamento"("loja_id");

-- CreateIndex
CREATE UNIQUE INDEX "destinos_remanejamento_remanejamento_id_loja_id_key" ON "destinos_remanejamento"("remanejamento_id", "loja_id");

-- CreateIndex
CREATE INDEX "itens_remanejamento_destino_id_idx" ON "itens_remanejamento"("destino_id");

-- CreateIndex
CREATE INDEX "itens_remanejamento_ean_idx" ON "itens_remanejamento"("ean");

-- CreateIndex
CREATE INDEX "itens_remanejamento_codigo_reduzido_idx" ON "itens_remanejamento"("codigo_reduzido");

-- CreateIndex
CREATE INDEX "registros_importacao_importacao_id_idx" ON "registros_importacao"("importacao_id");

-- CreateIndex
CREATE INDEX "registros_importacao_remanejamento_id_idx" ON "registros_importacao"("remanejamento_id");

-- CreateIndex
CREATE INDEX "registros_importacao_loja_destino_id_idx" ON "registros_importacao"("loja_destino_id");

-- CreateIndex
CREATE INDEX "registros_importacao_ean_idx" ON "registros_importacao"("ean");

-- CreateIndex
CREATE INDEX "registros_importacao_cnpj_filial_idx" ON "registros_importacao"("cnpj_filial");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_loja_origem_fisica_id_fkey" FOREIGN KEY ("loja_origem_fisica_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_usuario_comprador_id_fkey" FOREIGN KEY ("usuario_comprador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos" ADD CONSTRAINT "remanejamentos_loja_origem_id_fkey" FOREIGN KEY ("loja_origem_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos" ADD CONSTRAINT "remanejamentos_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remanejamentos" ADD CONSTRAINT "remanejamentos_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinos_remanejamento" ADD CONSTRAINT "destinos_remanejamento_remanejamento_id_fkey" FOREIGN KEY ("remanejamento_id") REFERENCES "remanejamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destinos_remanejamento" ADD CONSTRAINT "destinos_remanejamento_loja_id_fkey" FOREIGN KEY ("loja_id") REFERENCES "filiais"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_remanejamento" ADD CONSTRAINT "itens_remanejamento_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "destinos_remanejamento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_importacao" ADD CONSTRAINT "registros_importacao_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacoes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_importacao" ADD CONSTRAINT "registros_importacao_remanejamento_id_fkey" FOREIGN KEY ("remanejamento_id") REFERENCES "remanejamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registros_importacao" ADD CONSTRAINT "registros_importacao_loja_destino_id_fkey" FOREIGN KEY ("loja_destino_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
