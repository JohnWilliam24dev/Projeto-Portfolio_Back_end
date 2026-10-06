import { ExecutionContext, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllowedOriginGuard } from '../src/shared/auth/allowed-origin.guard';

function buildGuard(allowedOrigins: string | undefined): AllowedOriginGuard {
  const config = { get: () => allowedOrigins } as unknown as ConfigService;
  return new AllowedOriginGuard(config);
}

function contextWithOrigin(origin: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: origin === undefined ? {} : { origin } }) }),
  } as unknown as ExecutionContext;
}

function statusOf(fn: () => unknown): number | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof HttpException ? error.getStatus() : undefined;
  }
  return undefined;
}

describe('AllowedOriginGuard', () => {
  const guard = buildGuard('https://meu-site.com');

  it('responde 403 quando a requisição não traz Origin (curl, script)', () => {
    expect(statusOf(() => guard.canActivate(contextWithOrigin(undefined)))).toBe(403);
  });

  it('responde 403 para origem fora da lista, inclusive a literal "null"', () => {
    expect(statusOf(() => guard.canActivate(contextWithOrigin('https://outro-site.com')))).toBe(403);
    expect(statusOf(() => guard.canActivate(contextWithOrigin('null')))).toBe(403);
  });

  it('não aceita subdomínio nem esquema diferente (comparação exata)', () => {
    expect(statusOf(() => guard.canActivate(contextWithOrigin('https://www.meu-site.com')))).toBe(403);
    expect(statusOf(() => guard.canActivate(contextWithOrigin('http://meu-site.com')))).toBe(403);
    expect(statusOf(() => guard.canActivate(contextWithOrigin('https://meu-site.com:8443')))).toBe(403);
  });

  it('deixa passar a origem permitida', () => {
    expect(guard.canActivate(contextWithOrigin('https://meu-site.com'))).toBe(true);
  });

  it('normaliza a lista: entrada com barra final e maiúsculas ainda casa', () => {
    const normalizado = buildGuard(' HTTPS://Meu-Site.com/ , https://www.meu-site.com');
    expect(normalizado.canActivate(contextWithOrigin('https://meu-site.com'))).toBe(true);
    expect(normalizado.canActivate(contextWithOrigin('https://www.meu-site.com'))).toBe(true);
  });

  it('lista vazia ou ausente nega tudo (fail-closed)', () => {
    for (const lista of [undefined, '', '  ']) {
      expect(statusOf(() => buildGuard(lista).canActivate(contextWithOrigin('https://meu-site.com')))).toBe(403);
    }
  });

  it('a mensagem de erro é a prevista no plano', () => {
    try {
      guard.canActivate(contextWithOrigin(undefined));
      fail('deveria lançar');
    } catch (error) {
      expect((error as HttpException).getResponse()).toBe('Origem não permitida.');
    }
  });
});
