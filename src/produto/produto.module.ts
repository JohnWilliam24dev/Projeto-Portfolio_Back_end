import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { TelegramModule } from '../shared/notification/telegram.module';
import { ProdutoController } from './produto.controller';
import { ProdutoFacade } from './produto.facade';
import { ProdutoService } from './produto.service';
import { ImageSanitizerService } from '../shared/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from './notification/notification-gateway.port';
import { TelegramNotificationGateway } from './notification/telegram-notification.gateway';
import { PRODUTO_REPOSITORY } from './persistence/produto-repository.port';
import { PrismaProdutoRepository } from './persistence/prisma-produto.repository';

// Equivalente a createProdutoController.js: aqui é onde a "porta" NotificationGateway
// ganha uma implementação concreta. Trocar Telegram por e-mail/WhatsApp no futuro é só trocar
// este `useClass`, sem tocar em controller, service ou validação.
//
// `exports: [ProdutoFacade]` é a regra do projeto em código: ProdutoService,
// ImageSanitizerService e o NOTIFICATION_GATEWAY nunca saem daqui. Se outro módulo tentar
// importar ProdutoModule e injetar ProdutoService diretamente, o Nest recusa em tempo
// de bootstrap — a única porta de entrada é a facade.
@Module({
  imports: [PrismaModule, TelegramModule],
  controllers: [ProdutoController],
  providers: [
    ProdutoFacade,
    ProdutoService,
    ImageSanitizerService,
    { provide: NOTIFICATION_GATEWAY, useClass: TelegramNotificationGateway },
    { provide: PRODUTO_REPOSITORY, useClass: PrismaProdutoRepository },
  ],
  exports: [ProdutoFacade],
})
export class ProdutoModule {}
