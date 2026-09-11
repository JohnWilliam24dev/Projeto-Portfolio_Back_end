import { Module } from '@nestjs/common';
import { CommissionController } from './commission.controller';
import { CommissionFacade } from './commission.facade';
import { CommissionService } from './commission.service';
import { ImageSanitizerService } from './image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from './notification/notification-gateway.port';
import { TelegramNotificationGateway } from './notification/telegram-notification.gateway';

// Equivalente a createCommissionController.js: aqui é onde a "porta" NotificationGateway
// ganha uma implementação concreta. Trocar Telegram por e-mail/WhatsApp no futuro é só trocar
// este `useClass`, sem tocar em controller, service ou validação.
//
// `exports: [CommissionFacade]` é a regra do projeto em código: CommissionService,
// ImageSanitizerService e o NOTIFICATION_GATEWAY nunca saem daqui. Se outro módulo tentar
// importar CommissionModule e injetar CommissionService diretamente, o Nest recusa em tempo
// de bootstrap — a única porta de entrada é a facade.
@Module({
  controllers: [CommissionController],
  providers: [
    CommissionFacade,
    CommissionService,
    ImageSanitizerService,
    { provide: NOTIFICATION_GATEWAY, useClass: TelegramNotificationGateway },
  ],
  exports: [CommissionFacade],
})
export class CommissionModule {}
