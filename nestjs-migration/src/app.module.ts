import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommissionModule } from './commission/commission.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommissionModule,
  ],
})
export class AppModule {}
