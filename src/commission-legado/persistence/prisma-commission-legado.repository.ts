import { Inject, Injectable } from '@nestjs/common';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { SafeReferenceFile } from '../../shared/image/safe-reference-file';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { IMAGE_STORAGE, ImageStorage } from '../../shared/storage/image-storage.port';
import { CommissionLegadoOrder } from '../commission-legado.types';
import { CommissionLegadoRepository } from './commission-legado-repository.port';

@Injectable()
export class PrismaCommissionLegadoRepository implements CommissionLegadoRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async salvar(orderId: string, order: CommissionLegadoOrder, referenceFile: SafeReferenceFile): Promise<void> {
    // 1) Imagem primeiro: se o upload falhar, nada é gravado (sem linha sem imagem).
    const image = await this.imageStorage.upload(referenceFile, 'commission');

    // 2) Só então o banco, com a URL. Se falhar, apaga o arquivo pra não deixar órfão.
    try {
      await this.prisma.commissionLegado.create({
        data: {
          id: orderId,
          nickname: order.nickname,
          contact: order.contact,
          modelType: order.modelType,
          additionalContentNotes: order.additionalContentNotes,
          acessorios: order.acessorios,
          expressoesExtras: order.expressoesExtras,
          imagemUrl: image.url,
          imagemPublicId: image.publicId,
        },
      });
    } catch {
      await this.imageStorage.remove(image.publicId);
      throw new IntegrationError('Não foi possível registrar o pedido agora.');
    }
  }
}
