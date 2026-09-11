import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommissionModule } from './commission';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommissionModule,
  ],
})
export class AppModule {}
