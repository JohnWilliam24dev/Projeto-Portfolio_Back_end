import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedError } from '../errors/domain.errors';
import { AuthenticatedRequest } from './authenticated-request';
import { segredoConfereComHash, separarApiKey } from './api-key.util';

export const API_KEY_HEADER = 'x-api-key';

// Fica em shared/auth (não dentro do módulo maker) porque tanto `maker` quanto `produto`
// (e futuramente `commission` pro dashboard do Maker) precisam dele — é infraestrutura
// transversal, não regra de negócio de um módulo específico. Por isso depende do
// PrismaService diretamente em vez de passar por uma porta de repositório: a consulta é
// mínima (id + hash) e específica de autenticação, não vale abstrair mais que isso.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKeyHeader = request.headers[API_KEY_HEADER];
    const apiKey = Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    if (!apiKey) throw new UnauthorizedError('Credencial ausente.');

    const partes = separarApiKey(apiKey);
    if (!partes) throw new UnauthorizedError('Credencial em formato inválido.');

    const maker = await this.prisma.maker.findUnique({
      where: { id: partes.makerId },
      select: { id: true, apiKeySecretHash: true },
    });

    if (!maker?.apiKeySecretHash || !segredoConfereComHash(partes.segredo, maker.apiKeySecretHash)) {
      throw new UnauthorizedError('Credencial inválida.');
    }

    request.makerId = maker.id;
    return true;
  }
}
