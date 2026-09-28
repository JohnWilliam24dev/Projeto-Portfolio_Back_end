import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationError } from '../errors/domain.errors';
import { SafeReferenceFile } from '../image/safe-reference-file';

export interface TelegramPhotoMessage {
  caption: string;
  photo: SafeReferenceFile;
}

// Único ponto do projeto que fala HTTP com o Telegram (token, chat_id, FormData, timeout).
// Cada módulo (commission legado, produto) continua dono da PRÓPRIA legenda via seu gateway;
// aqui só mora o transporte, pra não duplicar o fetch entre os dois.
@Injectable()
export class TelegramSenderService {
  constructor(private readonly config: ConfigService) {}

  async sendPhoto({ caption, photo }: TelegramPhotoMessage): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.config.get<string>('TELEGRAM_CHAT_ID');
    if (!token || !chatId) throw new IntegrationError('Integração de notificações indisponível.');

    const form = new FormData();
    form.set('chat_id', chatId);
    form.set('caption', caption);
    // Uint8Array é o denominador comum entre Buffer (Node) e BlobPart (lib.dom) sem `as any`.
    form.set('photo', new Blob([new Uint8Array(photo.buffer)], { type: photo.mimeType }), `referencia.${photo.extension}`);

    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error('Telegram response was not successful');
    } catch {
      throw new IntegrationError();
    }
  }
}
