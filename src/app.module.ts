import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './shared/prisma/prisma.module';
import { CommissionModule } from './commission';
import { MakerModule } from './maker';
import { ProdutoModule } from './produto';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MakerModule,
    CommissionModule,
    ProdutoModule,
  ],
})
export class AppModule {}
