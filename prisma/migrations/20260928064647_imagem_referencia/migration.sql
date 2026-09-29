/*
  Warnings:

  - Added the required column `imagem_public_id` to the `commissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imagem_url` to the `commissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imagem_public_id` to the `produtos` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imagem_url` to the `produtos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "commissions" ADD COLUMN     "imagem_public_id" TEXT NOT NULL,
ADD COLUMN     "imagem_url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "produtos" ADD COLUMN     "imagem_public_id" TEXT NOT NULL,
ADD COLUMN     "imagem_url" TEXT NOT NULL;
