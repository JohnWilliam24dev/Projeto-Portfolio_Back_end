import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CatalogoModule } from './catalogo';
import { CommissionModule } from './commission';
import { CommissionLegadoModule } from './commission-legado';
import { MakerModule } from './maker';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MakerModule,
    CatalogoModule,
    CommissionLegadoModule,
    CommissionModule,
  ],
})
export class AppModule {}
