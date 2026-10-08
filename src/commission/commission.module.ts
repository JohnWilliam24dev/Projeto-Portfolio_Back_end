import { Module } from '@nestjs/common';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { TelegramModule } from '../shared/notification/telegram.module';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { StorageModule } from '../shared/storage/storage.module';
import { CommissionConsultaService } from './commission-consulta.service';
import { CommissionController } from './commission.controller';
import { CommissionFacade } from './commission.facade';
import { CommissionService } from './commission.service';
import { NOTIFICATION_GATEWAY } from './notification/notification-gateway.port';
import { TelegramNotificationGateway } from './notification/telegram-notification.gateway';
import { COMMISSION_CONSULTA_REPOSITORY, COMMISSION_REPOSITORY } from './persistence/commission-repository.port';
import { PrismaCommissionRepository } from './persistence/prisma-commission.repository';

// `exports: [CommissionFacade]` é a regra do projeto em código: services, sanitizer e gateway nunca
// saem daqui. Trocar Telegram por e-mail/WhatsApp = trocar este `useClass`, sem tocar no resto.
@Module({
  imports: [PrismaModule, TelegramModule, StorageModule],
  controllers: [CommissionController],
  providers: [
    CommissionFacade,
    CommissionService,
    CommissionConsultaService,
    ImageSanitizerService,
    { provide: NOTIFICATION_GATEWAY, useClass: TelegramNotificationGateway },
    PrismaCommissionRepository,
    { provide: COMMISSION_REPOSITORY, useExisting: PrismaCommissionRepository },
    { provide: COMMISSION_CONSULTA_REPOSITORY, useExisting: PrismaCommissionRepository },
  ],
  exports: [CommissionFacade],
})
export class CommissionModule {}
