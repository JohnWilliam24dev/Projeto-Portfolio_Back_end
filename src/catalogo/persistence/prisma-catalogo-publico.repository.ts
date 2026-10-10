import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CatalogoPublicoRegistro, CatalogoPublicoRepository } from './catalogo-publico-repository.port';

@Injectable()
export class PrismaCatalogoPublicoRepository implements CatalogoPublicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorMaker(makerId: string): Promise<CatalogoPublicoRegistro | null> {
    // Uma consulta só, com `select` explícito: nada além do que o formulário público precisa
    // (sem makerId, sem flags internas, sem tipos ou adicionais desabilitados).
    const maker = await this.prisma.maker.findUnique({
      where: { id: makerId },
      select: {
        tiposProduto: {
          where: { habilitado: true },
          orderBy: { nome: 'asc' },
          select: {
            id: true,
            nome: true,
            precoBase: true,
            adicionais: {
              where: { adicional: { habilitado: true } },
              orderBy: { adicional: { nome: 'asc' } },
              select: { adicional: { select: { id: true, nome: true, descricao: true, precoFixo: true, porcentagem: true } } },
            },
          },
        },
      },
    });
    if (!maker) return null;

    return {
      tipos: maker.tiposProduto.map(({ adicionais, ...tipo }) => ({
        ...tipo,
        adicionais: adicionais.map((vinculo) => vinculo.adicional),
      })),
    };
  }
}
