-- SGA v2: novo modelo (Maker > Status/TipoProduto/Adicional/Produto/Commission).
-- Escrita à mão a partir do schema.prisma (nomes de índices/constraints seguem a convenção do
-- Prisma). Única tabela com dados reais: `commissions` (legado) — é só renomeada, nunca recriada.

-- ---------------------------------------------------------------------------
-- 1) Legado: commissions -> commissions_legado (dados preservados)
-- ---------------------------------------------------------------------------
ALTER TABLE "commissions" RENAME TO "commissions_legado";
ALTER TABLE "commissions_legado" RENAME CONSTRAINT "commissions_pkey" TO "commissions_legado_pkey";

-- View de compatibilidade (TEMPORÁRIA): a migration roda no build, ANTES do novo deploy entrar
-- no ar. Sem ela, o deploy antigo (ainda atendendo o site) quebraria em POST /commission até o
-- novo código subir. View simples é auto-atualizável no Postgres: INSERT passa direto pra tabela.
-- Remover numa migration seguinte, depois que o deploy novo estiver em produção.
CREATE VIEW "commissions" AS SELECT * FROM "commissions_legado";

-- ---------------------------------------------------------------------------
-- 2) Modelo antigo do /produto (sem dados reais): removido por completo
-- ---------------------------------------------------------------------------
DROP TABLE "adicionais_produto";
DROP TABLE "produtos";
DROP TABLE "pedidos";
DROP TABLE "tipos_produto_adicional";
DROP TABLE "tipos_adicional";
DROP TABLE "tipos_produto";
DROP TYPE "StatusPedido";

-- ---------------------------------------------------------------------------
-- 3) Modelo novo
-- ---------------------------------------------------------------------------
CREATE TYPE "StatusTipo" AS ENUM ('INICIAL', 'EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

CREATE TABLE "status" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "tipo" "StatusTipo" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tipos_produto" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "preco_base" DECIMAL(10,2) NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_produto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "adicionais" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco_fixo" DECIMAL(10,2),
    "porcentagem" DECIMAL(5,2),
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adicionais_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tipos_produto_adicionais" (
    "tipo_produto_id" UUID NOT NULL,
    "adicional_id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,

    CONSTRAINT "tipos_produto_adicionais_pkey" PRIMARY KEY ("tipo_produto_id","adicional_id")
);

CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "tipo_produto_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "imagem_url" TEXT NOT NULL,
    "imagem_public_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commissions_v2" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "tipo_produto_id" UUID NOT NULL,
    "status_id" UUID NOT NULL,
    "token" VARCHAR(5) NOT NULL,
    "nome_cliente" TEXT NOT NULL,
    "contato" TEXT NOT NULL,
    "email" TEXT,
    "descricao" TEXT NOT NULL,
    "imagem_ref_url" TEXT NOT NULL,
    "imagem_ref_public_id" TEXT NOT NULL,
    "preco_simulado" DECIMAL(10,2) NOT NULL,
    "orcamento_final" DECIMAL(10,2),
    "posicao" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_v2_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "commission_adicionais" (
    "id" UUID NOT NULL,
    "maker_id" UUID NOT NULL,
    "commission_id" UUID NOT NULL,
    "adicional_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "descricao_cliente" TEXT NOT NULL,
    "valor_unitario" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "commission_adicionais_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE UNIQUE INDEX "status_id_maker_id_key" ON "status"("id", "maker_id");
CREATE INDEX "status_maker_id_ordem_idx" ON "status"("maker_id", "ordem");

CREATE UNIQUE INDEX "tipos_produto_id_maker_id_key" ON "tipos_produto"("id", "maker_id");
CREATE INDEX "tipos_produto_maker_id_idx" ON "tipos_produto"("maker_id");

CREATE UNIQUE INDEX "adicionais_id_maker_id_key" ON "adicionais"("id", "maker_id");
CREATE INDEX "adicionais_maker_id_idx" ON "adicionais"("maker_id");

CREATE INDEX "tipos_produto_adicionais_adicional_id_idx" ON "tipos_produto_adicionais"("adicional_id");
CREATE INDEX "tipos_produto_adicionais_maker_id_idx" ON "tipos_produto_adicionais"("maker_id");

CREATE INDEX "produtos_maker_id_criado_em_idx" ON "produtos"("maker_id", "criado_em");
CREATE INDEX "produtos_tipo_produto_id_idx" ON "produtos"("tipo_produto_id");

CREATE UNIQUE INDEX "commissions_v2_token_key" ON "commissions_v2"("token");
CREATE UNIQUE INDEX "commissions_v2_id_maker_id_key" ON "commissions_v2"("id", "maker_id");
CREATE INDEX "commissions_v2_maker_id_status_id_posicao_idx" ON "commissions_v2"("maker_id", "status_id", "posicao");
CREATE INDEX "commissions_v2_tipo_produto_id_idx" ON "commissions_v2"("tipo_produto_id");

CREATE UNIQUE INDEX "commission_adicionais_commission_id_adicional_id_key" ON "commission_adicionais"("commission_id", "adicional_id");
CREATE INDEX "commission_adicionais_adicional_id_idx" ON "commission_adicionais"("adicional_id");
CREATE INDEX "commission_adicionais_maker_id_idx" ON "commission_adicionais"("maker_id");

-- Chaves estrangeiras. As compostas (x_id, maker_id) é que impedem, no banco, ligar registros de
-- Makers diferentes (tipo de A com status de B, adicional de A em commission de B...).
ALTER TABLE "status" ADD CONSTRAINT "status_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tipos_produto" ADD CONSTRAINT "tipos_produto_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "adicionais" ADD CONSTRAINT "adicionais_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "tipos_produto_adicionais" ADD CONSTRAINT "tipos_produto_adicionais_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tipos_produto_adicionais" ADD CONSTRAINT "tipos_produto_adicionais_tipo_produto_id_maker_id_fkey" FOREIGN KEY ("tipo_produto_id", "maker_id") REFERENCES "tipos_produto"("id", "maker_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tipos_produto_adicionais" ADD CONSTRAINT "tipos_produto_adicionais_adicional_id_maker_id_fkey" FOREIGN KEY ("adicional_id", "maker_id") REFERENCES "adicionais"("id", "maker_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "produtos" ADD CONSTRAINT "produtos_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_tipo_produto_id_maker_id_fkey" FOREIGN KEY ("tipo_produto_id", "maker_id") REFERENCES "tipos_produto"("id", "maker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commissions_v2" ADD CONSTRAINT "commissions_v2_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions_v2" ADD CONSTRAINT "commissions_v2_tipo_produto_id_maker_id_fkey" FOREIGN KEY ("tipo_produto_id", "maker_id") REFERENCES "tipos_produto"("id", "maker_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commissions_v2" ADD CONSTRAINT "commissions_v2_status_id_maker_id_fkey" FOREIGN KEY ("status_id", "maker_id") REFERENCES "status"("id", "maker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_adicionais" ADD CONSTRAINT "commission_adicionais_maker_id_fkey" FOREIGN KEY ("maker_id") REFERENCES "makers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_adicionais" ADD CONSTRAINT "commission_adicionais_commission_id_maker_id_fkey" FOREIGN KEY ("commission_id", "maker_id") REFERENCES "commissions_v2"("id", "maker_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commission_adicionais" ADD CONSTRAINT "commission_adicionais_adicional_id_maker_id_fkey" FOREIGN KEY ("adicional_id", "maker_id") REFERENCES "adicionais"("id", "maker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- 4) Regras que o Prisma não expressa (SGA seção 4)
-- ---------------------------------------------------------------------------
-- Adicional: exatamente um entre preço fixo e porcentagem
ALTER TABLE "adicionais"
  ADD CONSTRAINT "chk_adicional_regra_preco"
  CHECK (num_nonnulls("preco_fixo", "porcentagem") = 1);

-- Valores não negativos / quantidade positiva
ALTER TABLE "adicionais"
  ADD CONSTRAINT "chk_adicional_valores"
  CHECK (("preco_fixo" IS NULL OR "preco_fixo" >= 0)
     AND ("porcentagem" IS NULL OR "porcentagem" >= 0));

ALTER TABLE "tipos_produto"
  ADD CONSTRAINT "chk_tipo_produto_preco" CHECK ("preco_base" >= 0);

ALTER TABLE "commission_adicionais"
  ADD CONSTRAINT "chk_commission_adicional_qtd" CHECK ("quantidade" > 0);

-- Status: no máximo 1 INICIAL por Maker
CREATE UNIQUE INDEX "status_um_inicial_por_maker"
  ON "status" ("maker_id") WHERE "tipo" = 'INICIAL';

-- ---------------------------------------------------------------------------
-- 5) Backfill: Makers que já existem ganham o kanban padrão (nunca Maker sem kanban)
-- ---------------------------------------------------------------------------
INSERT INTO "status" ("id", "maker_id", "nome", "ordem", "tipo")
SELECT gen_random_uuid(), m."id", s."nome", s."ordem", s."tipo"::"StatusTipo"
FROM "makers" m
CROSS JOIN (VALUES
    ('Fila', 1, 'INICIAL'),
    ('Em andamento', 2, 'EM_ANDAMENTO'),
    ('Concluído', 3, 'CONCLUIDO'),
    ('Cancelado', 4, 'CANCELADO')
) AS s("nome", "ordem", "tipo");
