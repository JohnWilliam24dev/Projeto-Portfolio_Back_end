import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MODEL_LABELS } from '../../config/commission.config';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { NotificationGateway } from './notification-gateway.port';
import { NotifyPayload } from '../commission.types';

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

// Único ponto do módulo acoplado ao Telegram — igual à intenção original do gateway atual.
// Trocar de provedor de notificação significa criar outra classe que implemente
// NotificationGateway e trocar o `useClass` no commission.module.ts.
@Injectable()
export class TelegramNotificationGateway implements NotificationGateway {
  constructor(private readonly config: ConfigService) {}

  async notify(payload: NotifyPayload): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!token || !chatId) throw new IntegrationError('Integração de notificações indisponível.');

    const form = new FormData();
    form.set('chat_id', chatId);
    form.set('caption', formatCaption(payload));
    form.set(
      'photo',
      new Blob([payload.referenceFile.buffer], { type: payload.referenceFile.mimeType }),
      `referencia.${payload.referenceFile.extension}`,
    );

    try {
      const telegramResponse = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(8_000),
      });
      if (!telegramResponse.ok) throw new Error('Telegram response was not successful');
    } catch {
      throw new IntegrationError();
    }
  }
}
