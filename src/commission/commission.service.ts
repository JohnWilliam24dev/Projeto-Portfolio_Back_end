import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ValidationError } from '../shared/errors/domain.errors';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY, NotificationGateway } from './notification/notification-gateway.port';
import { CommissionOrder } from './commission.types';
import { COMMISSION_REPOSITORY, CommissionRepository } from './persistence/commission-repository.port';

const MAX_QUANTITY = 20;

// Mesmo papel do commissionService.js: orquestra validação -> sanitização -> geração de id ->
// notificação, sem saber (nem precisar saber) que existe Telegram por trás da porta injetada.
@Injectable()
export class CommissionService {
  constructor(
    private readonly imageSanitizer: ImageSanitizerService,
    @Inject(NOTIFICATION_GATEWAY) private readonly notificationGateway: NotificationGateway,
    @Inject(COMMISSION_REPOSITORY) private readonly commissionRepository: CommissionRepository,
  ) {}

  async submit(dto: CreateCommissionDto, referenceFile: Express.Multer.File) {
    if (dto.website) throw new ValidationError('Pedido inválido.');

    const order: CommissionOrder = {
      nickname: dto.nickname,
      contact: dto.contact,
      modelType: dto.modelType,
      additionalContentNotes: dto.additionalContentNotes ?? '',
      acessorios: this.parseQuantity(dto.acessorios, 'Quantidade de acessórios'),
      expressoesExtras: this.parseQuantity(dto.expressoesExtras, 'Quantidade de expressões'),
    };

    const safeReferenceFile = await this.imageSanitizer.sanitize(referenceFile);
    const orderId = randomUUID();
    // Único acréscimo ao fluxo da main: persistir ANTES de notificar. Contrato de entrada,
    // resposta ({ orderId }) e erros (502 se o Telegram falhar) seguem idênticos ao legado.
    await this.commissionRepository.salvar(orderId, order);
    await this.notificationGateway.notify({ orderId, order, referenceFile: safeReferenceFile });
    return { orderId };
  }

  // Regra de negócio (teto de 20) mora aqui, não no DTO — o DTO só garante formato de string numérica.
  private parseQuantity(value: string, label: string): number {
    const quantity = Number(value);
    if (quantity > MAX_QUANTITY) throw new ValidationError(`${label} inválida.`);
    return quantity;
  }
}
