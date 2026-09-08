import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { ImageSanitizerService } from './image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from './notification/notification-gateway.port';
import { TelegramNotificationGateway } from './notification/telegram-notification.gateway';

// Equivalente a createCommissionController.js: aqui é onde a "porta" NotificationGateway
// ganha uma implementação concreta. Trocar Telegram por e-mail/WhatsApp no futuro é só trocar
// este `useClass`, sem tocar em controller, service ou validação.
@Module({
  controllers: [CommissionController],
  providers: [
    CommissionService,
    ImageSanitizerService,
    { provide: NOTIFICATION_GATEWAY, useClass: TelegramNotificationGateway },
  ],
})
export class CommissionModule {}
