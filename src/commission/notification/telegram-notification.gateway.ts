import { Injectable } from '@nestjs/common';
import { TELEGRAM_CAPTION_LIMIT } from '../../config/commission.config';
import { TelegramSenderService } from '../../shared/notification/telegram-sender.service';
import { NotifyPayload } from '../commission.types';
import { NotificationGateway } from './notification-gateway.port';

// O Telegram recusa legenda de foto acima de 1024 caracteres. Os campos de tamanho livre
// (descrição, adicionais) vão por ÚLTIMO: se estourar, o que se perde é o fim do texto longo,
// nunca token, contato, tipo ou valor. Corta por code point pra não partir um emoji ao meio.
export function formatLegenda(payload: NotifyPayload): string {
  const adicionais = payload.adicionais.length
    ? payload.adicionais
        .map((a) => `• ${a.nome} x${a.quantidade}: ${a.descricaoCliente} (R$ ${a.valorUnitario.toFixed(2)} cada)`)
        .join('\n')
    : 'Nenhum';

  const completa = [
    `Novo pedido #${payload.token}`,
    `Cliente: ${payload.nomeCliente}`,
    `Contato: ${payload.contato}`,
    ...(payload.email ? [`E-mail: ${payload.email}`] : []),
    `Tipo: ${payload.tipoProdutoNome}`,
    `Valor simulado: R$ ${payload.precoSimulado.toFixed(2)}`,
    `Descrição: ${payload.descricao}`,
    `Adicionais:\n${adicionais}`,
  ].join('\n');

  const caracteres = Array.from(completa);
  if (caracteres.length <= TELEGRAM_CAPTION_LIMIT) return completa;
  return `${caracteres.slice(0, TELEGRAM_CAPTION_LIMIT - 1).join('')}…`;
}

// Só monta a legenda; o transporte HTTP mora em TelegramSenderService (shared).
@Injectable()
export class TelegramNotificationGateway implements NotificationGateway {
  constructor(private readonly telegram: TelegramSenderService) {}

  async notify(payload: NotifyPayload): Promise<void> {
    await this.telegram.sendPhoto({ caption: formatLegenda(payload), photo: payload.referenceFile });
  }
}
