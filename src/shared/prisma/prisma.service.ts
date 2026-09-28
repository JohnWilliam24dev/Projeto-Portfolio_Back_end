import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma-client';

// Prisma 7 removeu o `new PrismaClient()` sem argumentos: a conexão com o Postgres agora
// é sempre explícita via driver adapter (@prisma/adapter-pg + pg), não mais um binário de
// engine escondido por trás do client. `getOrThrow` falha rápido e alto se DATABASE_URL
// não estiver configurada, em vez de deixar a primeira query falhar com um erro confuso.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }) });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Conectado ao Postgres via driver adapter (@prisma/adapter-pg).');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Conexão com o Postgres encerrada.');
  }
}
