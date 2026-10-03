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
    // Único acréscimo ao fluxo da main: subir a imagem + persistir ANTES de notificar.
    // O buffer segue em memória: o Telegram recebe a imagem em si (não o link), como sempre. Contrato de entrada,
    // resposta ({ orderId }) e erros (502 se o Telegram falhar) seguem idênticos ao legado.
    await this.commissionRepository.salvar(orderId, order, safeReferenceFile);
    await this.notificationGateway.notify({ orderId, order, referenceFile: safeReferenceFile });
    return { orderId };
  }

  // Regra de negócio (inteiro entre 0 e 20) mora aqui, não no DTO — o DTO só garante o formato.
  // A checagem de piso/inteiro é redundante com o DTO de propósito: o service não deve
  // depender de quem o chamou ter validado antes.
  private parseQuantity(value: string, label: string): number {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
      throw new ValidationError(`${label} inválida.`);
    }
    return quantity;
  }
}
