-- CreateEnum
CREATE TYPE "resultado_auditoria" AS ENUM ('sucesso', 'falha', 'bloqueio', 'negacao');

-- AlterTable
ALTER TABLE "filiais"
  ADD COLUMN "senha_hash" VARCHAR(255),
  ADD COLUMN "precisa_trocar_senha" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "senha_alterada_em" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" TEXT NOT NULL,
    "tipo_evento" VARCHAR(80) NOT NULL,
    "acao" VARCHAR(120) NOT NULL,
    "resultado" "resultado_auditoria" NOT NULL,
    "descricao" TEXT NOT NULL,
    "filial_id" VARCHAR(20),
    "usuario_id" TEXT,
    "sessao_id" VARCHAR(120),
    "origem_id" VARCHAR(120),
    "ip_observado" VARCHAR(80),
    "ip_fonte" VARCHAR(40),
    "geolocalizacao" JSONB,
    "entidade_tipo" VARCHAR(60),
    "entidade_id" VARCHAR(80),
    "metadados" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tentativas_login" (
    "id" TEXT NOT NULL,
    "filial_id" VARCHAR(20),
    "ip_observado" VARCHAR(80) NOT NULL,
    "chave_origem" VARCHAR(160) NOT NULL,
    "sucesso" BOOLEAN NOT NULL DEFAULT false,
    "motivo" VARCHAR(80),
    "user_agent" VARCHAR(255),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueios_origem" (
    "id" TEXT NOT NULL,
    "filial_id" VARCHAR(20),
    "ip_observado" VARCHAR(80) NOT NULL,
    "chave_origem" VARCHAR(160) NOT NULL,
    "escopo" VARCHAR(40) NOT NULL DEFAULT 'filial_ip',
    "tentativas_invalidas" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_ate" TIMESTAMP(3) NOT NULL,
    "ultimo_bloqueio_em" TIMESTAMP(3),
    "liberado_em" TIMESTAMP(3),
    "motivo" VARCHAR(80),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bloqueios_origem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_auditoria_criado_em_idx" ON "logs_auditoria"("criado_em" DESC);

-- CreateIndex
CREATE INDEX "logs_auditoria_tipo_evento_criado_em_idx" ON "logs_auditoria"("tipo_evento", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "logs_auditoria_filial_id_criado_em_idx" ON "logs_auditoria"("filial_id", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "logs_auditoria_resultado_criado_em_idx" ON "logs_auditoria"("resultado", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "logs_auditoria_ip_observado_criado_em_idx" ON "logs_auditoria"("ip_observado", "criado_em" DESC);

-- CreateIndex
CREATE INDEX "tentativas_login_chave_origem_criado_em_idx" ON "tentativas_login"("chave_origem", "criado_em");

-- CreateIndex
CREATE INDEX "tentativas_login_filial_id_ip_observado_criado_em_idx" ON "tentativas_login"("filial_id", "ip_observado", "criado_em");

-- CreateIndex
CREATE INDEX "tentativas_login_criado_em_idx" ON "tentativas_login"("criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "bloqueios_origem_chave_origem_key" ON "bloqueios_origem"("chave_origem");

-- CreateIndex
CREATE INDEX "bloqueios_origem_bloqueado_ate_idx" ON "bloqueios_origem"("bloqueado_ate");

-- CreateIndex
CREATE INDEX "bloqueios_origem_filial_id_ip_observado_idx" ON "bloqueios_origem"("filial_id", "ip_observado");

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tentativas_login" ADD CONSTRAINT "tentativas_login_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bloqueios_origem" ADD CONSTRAINT "bloqueios_origem_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
