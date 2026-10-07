import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CommissionLegadoModule } from './commission-legado';
import { MakerModule } from './maker';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MakerModule,
    CommissionLegadoModule,
  ],
})
export class AppModule {}
