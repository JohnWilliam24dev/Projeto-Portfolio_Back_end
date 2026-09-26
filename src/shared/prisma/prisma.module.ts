import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() porque acesso ao banco é infraestrutura transversal, igual ConfigModule.
// Outros módulos ainda importam PrismaModule explicitamente (mesmo sendo global) só
// pra deixar a dependência visível no código — não é redundante, é documentação.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
