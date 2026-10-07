import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { TelegramModule } from '../shared/notification/telegram.module';
import { StorageModule } from '../shared/storage/storage.module';
import { CommissionLegadoController } from './commission-legado.controller';
import { CommissionLegadoFacade } from './commission-legado.facade';
import { CommissionLegadoService } from './commission-legado.service';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from './notification/notification-gateway.port';
import { TelegramNotificationGateway } from './notification/telegram-notification.gateway';
import { COMMISSION_LEGADO_REPOSITORY } from './persistence/commission-legado-repository.port';
import { PrismaCommissionLegadoRepository } from './persistence/prisma-commission-legado.repository';

// Equivalente a createCommissionController.js: aqui é onde a "porta" NotificationGateway
// ganha uma implementação concreta. Trocar Telegram por e-mail/WhatsApp no futuro é só trocar
// este `useClass`, sem tocar em controller, service ou validação.
//
// `exports: [CommissionLegadoFacade]` é a regra do projeto em código: CommissionLegadoService,
// ImageSanitizerService e o NOTIFICATION_GATEWAY nunca saem daqui. Se outro módulo tentar
// importar CommissionLegadoModule e injetar CommissionLegadoService diretamente, o Nest recusa em tempo
// de bootstrap — a única porta de entrada é a facade.
@Module({
  imports: [PrismaModule, TelegramModule, StorageModule],
  controllers: [CommissionLegadoController],
  providers: [
    CommissionLegadoFacade,
    CommissionLegadoService,
    ImageSanitizerService,
    { provide: NOTIFICATION_GATEWAY, useClass: TelegramNotificationGateway },
    { provide: COMMISSION_LEGADO_REPOSITORY, useClass: PrismaCommissionLegadoRepository },
  ],
  exports: [CommissionLegadoFacade],
})
export class CommissionLegadoModule {}
