import { Injectable } from '@nestjs/common';
import { MODEL_LABELS } from '../../config/commission-legado.config';
import { TelegramSenderService } from '../../shared/notification/telegram-sender.service';
import { NotificationGateway } from './notification-gateway.port';
import { NotifyPayload } from '../commission-legado.types';

function formatCaption({ orderId, order }: NotifyPayload): string {
  return [
    `Novo pedido #${orderId}`,
    `Nome: ${order.nickname}`,
    `Contato: ${order.contact}`,
    `Modelo: ${MODEL_LABELS[order.modelType]}`,
    `Acessórios: ${order.acessorios}`,
    `Expressões extras: ${order.expressoesExtras}`,
    `Adicionais: ${order.additionalContentNotes || 'Nenhum'}`,
  ].join('\n');
}

// Só monta a legenda no formato ANTIGO; o transporte HTTP mora em TelegramSenderService (shared).
@Injectable()
export class TelegramNotificationGateway implements NotificationGateway {
  constructor(private readonly telegram: TelegramSenderService) {}

  async notify(payload: NotifyPayload): Promise<void> {
    await this.telegram.sendPhoto({ caption: formatCaption(payload), photo: payload.referenceFile });
  }
}
