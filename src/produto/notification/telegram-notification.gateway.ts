import { Injectable } from '@nestjs/common';
import { TelegramSenderService } from '../../shared/notification/telegram-sender.service';
import { NotificationGateway } from './notification-gateway.port';
import { NotifyPayload } from '../produto.types';

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

// Só monta a legenda do /produto; o transporte HTTP mora em TelegramSenderService (shared).
// Trocar de provedor de notificação = outra classe que implemente NotificationGateway e
// trocar o `useClass` no produto.module.ts.
@Injectable()
export class TelegramNotificationGateway implements NotificationGateway {
  constructor(private readonly telegram: TelegramSenderService) {}

  async notify(payload: NotifyPayload): Promise<void> {
    await this.telegram.sendPhoto({ caption: formatCaption(payload), photo: payload.referenceFile });
  }
}
