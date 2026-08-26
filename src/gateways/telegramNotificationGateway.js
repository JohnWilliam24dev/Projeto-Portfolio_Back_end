import { MODEL_LABELS } from '../config/commission.js';
import { IntegrationError } from '../shared/errors/HttpError.js';

function formatCaption({ orderId, order }) {
  return [`Novo pedido #${orderId}`, `Nome: ${order.nickname}`, `Contato: ${order.contact}`, `Modelo: ${MODEL_LABELS[order.modelType]}`, `Acessórios: ${order.acessorios}`, `Expressões extras: ${order.expressoesExtras}`, `Adicionais: ${order.additionalContentNotes || 'Nenhum'}`].join('\n');
}

// NotificationGateway port: adapters for e-mail or WhatsApp only need a notify(payload) method.
export function createTelegramNotificationGateway({ token, chatId, httpClient = fetch }) {
  return {
    async notify({ orderId, order, referenceFile }) {
      if (!token || !chatId) throw new IntegrationError('Integração de notificações indisponível.');
      const form = new FormData();
      form.set('chat_id', chatId);
      form.set('caption', formatCaption({ orderId, order }));
      form.set('photo', new Blob([referenceFile.buffer], { type: referenceFile.mimeType }), `referencia.${referenceFile.extension}`);
      try {
        const telegramResponse = await httpClient(`https://api.telegram.org/bot${token}/sendPhoto`, { method: 'POST', body: form, signal: AbortSignal.timeout(8_000) });
        if (!telegramResponse.ok) throw new Error('Telegram response was not successful');
      } catch {
        throw new IntegrationError();
      }
    },
  };
}
