import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { MakerController } from './maker.controller';
import { MakerService } from './maker.service';
import { MAKER_REPOSITORY } from './persistence/maker-repository.port';
import { PrismaMakerRepository } from './persistence/prisma-maker.repository';

@Module({
  imports: [PrismaModule],
  controllers: [MakerController],
  providers: [MakerService, { provide: MAKER_REPOSITORY, useClass: PrismaMakerRepository }],
  exports: [MakerService],
})
export class MakerModule {}
