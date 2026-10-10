import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../shared/errors/domain.errors';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { isPrismaError } from '../../shared/prisma/prisma-errors';
import { AdicionalRegistro, AdicionalRepository, AtualizarAdicionalInput, CriarAdicionalInput } from './adicional-repository.port';

const SELECT = {
  id: true,
  nome: true,
  descricao: true,
  precoFixo: true,
  porcentagem: true,
  habilitado: true,
  criadoEm: true,
} as const;

const chave = (makerId: string, id: string) => ({ id_makerId: { id, makerId } });

@Injectable()
export class PrismaAdicionalRepository implements AdicionalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(makerId: string): Promise<AdicionalRegistro[]> {
    return this.prisma.adicional.findMany({ where: { makerId }, orderBy: { nome: 'asc' }, select: SELECT });
  }

  async buscarPorId(makerId: string, id: string): Promise<AdicionalRegistro | null> {
    return this.prisma.adicional.findUnique({ where: chave(makerId, id), select: SELECT });
  }

  async criar(makerId: string, input: CriarAdicionalInput): Promise<AdicionalRegistro> {
    return this.prisma.adicional.create({ data: { makerId, ...input }, select: SELECT });
  }

  async atualizar(makerId: string, id: string, input: AtualizarAdicionalInput): Promise<AdicionalRegistro> {
    try {
      return await this.prisma.adicional.update({ where: chave(makerId, id), data: input, select: SELECT });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw new NotFoundError('Adicional não encontrado.');
      throw error;
    }
  }

  async temUso(makerId: string, id: string): Promise<boolean> {
    const uso = await this.prisma.commissionAdicional.findFirst({ where: { adicionalId: id, makerId }, select: { id: true } });
    return uso !== null;
  }

  async excluir(makerId: string, id: string): Promise<void> {
    try {
      await this.prisma.adicional.delete({ where: chave(makerId, id) });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw new NotFoundError('Adicional não encontrado.');
      if (isPrismaError(error, 'P2003')) throw new ConflictError('Este adicional passou a ser usado em pedidos. Desabilite em vez de excluir.');
      throw error;
    }
  }

  async contarPorIds(makerId: string, ids: string[]): Promise<number> {
    return this.prisma.adicional.count({ where: { id: { in: ids }, makerId } });
  }
}
