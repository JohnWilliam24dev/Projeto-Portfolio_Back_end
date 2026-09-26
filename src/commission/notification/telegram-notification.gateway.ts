import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { NotificationGateway } from './notification-gateway.port';
import { NotifyPayload } from '../commission.types';

function formatCaption(payload: NotifyPayload): string {
  const linhasAdicionais = payload.adicionais.length
    ? payload.adicionais.map((a) => `• ${a.nome}: ${a.descricao} (R$ ${a.valor.toFixed(2)})`).join('\n')
    : 'Nenhum';

  return [
    `Novo pedido #${payload.token}`,
    `Cliente: ${payload.nomeCliente}`,
    `Contato: ${payload.contato}`,
    `Tipo: ${payload.tipoProdutoNome}`,
    `Descrição: ${payload.descricao}`,
    `Adicionais:\n${linhasAdicionais}`,
    `Valor simulado: R$ ${payload.precoSimulado.toFixed(2)}`,
  ].join('\n');
}

// Único ponto do módulo acoplado ao Telegram. Multi-maker de verdade ainda vai precisar
// de um chat_id por Maker (hoje TELEGRAM_CHAT_ID é global, via env) — não mexi nisso agora
// pra não expandir o escopo desta troca; fica registrado como próximo débito.
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
      new Blob([new Uint8Array(payload.referenceFile.buffer)], { type: payload.referenceFile.mimeType }),
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
