/**
 * Ponto único de import do client gerado pelo `prisma generate` (gerador `prisma-client`,
 * Prisma 7). Todo o resto do projeto importa `PrismaClient`/`Prisma` a partir DESTE arquivo,
 * nunca direto de `../../generated/prisma/...` — se o caminho gerado mudar de estrutura
 * numa atualização futura do Prisma, o ajuste fica concentrado aqui.
 *
 * NOTA: o caminho abaixo não foi validado rodando `prisma generate` de verdade (ambiente
 * sem acesso a binaries.prisma.sh no momento em que este arquivo foi escrito). Rode
 * `npx prisma generate` localmente; se o import falhar, o caminho real costuma ser
 * `../../generated/prisma/client` ou `../../generated/prisma` — ajuste só a linha abaixo.
 */
export { PrismaClient, Prisma } from '../../generated/prisma/client';
