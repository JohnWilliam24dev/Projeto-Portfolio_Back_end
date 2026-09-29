-- AlterTable
ALTER TABLE "makers" ADD COLUMN     "api_key_gerada_em" TIMESTAMP(3),
ADD COLUMN     "api_key_secret_hash" TEXT;

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,
    "additional_content_notes" TEXT NOT NULL DEFAULT '',
    "acessorios" INTEGER NOT NULL,
    "expressoes_extras" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);
