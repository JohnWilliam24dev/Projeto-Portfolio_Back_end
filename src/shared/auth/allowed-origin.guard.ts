import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { ForbiddenError } from '../errors/domain.errors';
import { normalizeOrigin, parseAllowedOrigins } from './allowed-origins.util';

// CORS só instrui o NAVEGADOR; o servidor continuava processando qualquer POST (curl, script,
// outro site). Este guard recusa no servidor toda requisição cujo `Origin` esteja ausente ou
// fora de ALLOWED_ORIGINS. Fail-closed: lista vazia nega tudo.
//
// Limite honesto: `Origin` é forjável por script, então isto barra curl ingênuo e sites de
// terceiros, mas NÃO é fronteira de segurança — é a primeira de várias camadas (rate limit,
// captcha etc. — ver seção 12 do plano SGA).
//
// Uso: apenas em rotas consumidas pelo site público. Rotas do painel do Maker (app
// offline-first) e do cadastro de Maker NÃO usam este guard.
@Injectable()
export class AllowedOriginGuard implements CanActivate {
  private readonly allowed: ReadonlySet<string>;

  constructor(config: ConfigService) {
    this.allowed = new Set(parseAllowedOrigins(config.get<string>('ALLOWED_ORIGINS')));
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (!origin || !this.allowed.has(normalizeOrigin(origin))) {
      throw new ForbiddenError('Origem não permitida.');
    }
    return true;
  }
}
