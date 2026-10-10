import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest } from './authenticated-request';

// Entrega o makerId que o ApiKeyGuard gravou na requisição. É a ÚNICA origem aceitável do Maker
// nas rotas do painel: o makerId nunca vem de body, query ou path (SGA 5.1).
export const MakerAutenticado = createParamDecorator((_data: unknown, context: ExecutionContext): string =>
  context.switchToHttp().getRequest<AuthenticatedRequest>().makerId,
);
