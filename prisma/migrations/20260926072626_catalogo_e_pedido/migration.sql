-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

-- CreateTable
CREATE TABLE "makers" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "termos_condicoes" TEXT,
    "faco_e_nao_faco" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "makers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_produto" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "preco_medio" DECIMAL(10,2) NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_adicional" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "porcentagem" DECIMAL(5,2),
    "valor_fixo" DECIMAL(10,2),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_adicional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_produto_adicional" (
    "tipo_produto_id" UUID NOT NULL,
    "tipo_adicional_id" UUID NOT NULL,

    CONSTRAINT "tipos_produto_adicional_pkey" PRIMARY KEY ("tipo_produto_id","tipo_adicional_id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "tipo_produto_id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "nome_cliente" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "preco_simulado" DECIMAL(10,2) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adicionais_produto" (
    "id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "tipo_adicional_id" UUID NOT NULL,
    "descricao" TEXT NOT NULL,

    CONSTRAINT "adicionais_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "token" VARCHAR(5) NOT NULL,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tipos_produto_maker_id_idx" ON "tipos_produto"("maker_id");

-- CreateIndex
CREATE INDEX "tipos_adicional_maker_id_idx" ON "tipos_adicional"("maker_id");

-- CreateIndex
CREATE INDEX "produtos_maker_id_idx" ON "produtos"("maker_id");

-- CreateIndex
CREATE INDEX "produtos_tipo_produto_id_idx" ON "produtos"("tipo_produto_id");

-- CreateIndex
CREATE INDEX "produtos_pedido_id_idx" ON "produtos"("pedido_id");

-- CreateIndex
CREATE INDEX "adicionais_produto_produto_id_idx" ON "adicionais_produto"("produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_token_key" ON "pedidos"("token");

-- CreateIndex
CREATE INDEX "pedidos_maker_id_idx" ON "pedidos"("maker_id");

-- AddForeignKey
ALTER TABLE "tipos_produto" ADD CONSTRAINT "tipos_produto_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_adicional" ADD CONSTRAINT "tipos_adicional_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_produto_adicional" ADD CONSTRAINT "tipos_produto_adicional_tipo_produto_id_fkey" FOREIGN KEY ("tipo_produto_id") REFERENCES "tipos_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tipos_produto_adicional" ADD CONSTRAINT "tipos_produto_adicional_tipo_adicional_id_fkey" FOREIGN KEY ("tipo_adicional_id") REFERENCES "tipos_adicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tipo_produto_id_fkey" FOREIGN KEY ("tipo_produto_id") REFERENCES "tipos_produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adicionais_produto" ADD CONSTRAINT "adicionais_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adicionais_produto" ADD CONSTRAINT "adicionais_produto_tipo_adicional_id_fkey" FOREIGN KEY ("tipo_adicional_id") REFERENCES "tipos_adicional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tipos_adicional" ADD CONSTRAINT "chk_tipo_adicional_regra_preco" CHECK (num_nonnulls("porcentagem", "valor_fixo") = 1);