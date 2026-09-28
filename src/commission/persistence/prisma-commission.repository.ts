import { Injectable } from '@nestjs/common';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CommissionOrder } from '../commission.types';
import { CommissionRepository } from './commission-repository.port';

@Injectable()
export class PrismaCommissionRepository implements CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async salvar(orderId: string, order: CommissionOrder): Promise<void> {
    try {
      await this.prisma.commission.create({
        data: {
          id: orderId,
          nickname: order.nickname,
          contact: order.contact,
          modelType: order.modelType,
          additionalContentNotes: order.additionalContentNotes,
          acessorios: order.acessorios,
          expressoesExtras: order.expressoesExtras,
        },
      });
    } catch {
      throw new IntegrationError('Não foi possível registrar o pedido agora.');
    }
  }
}
