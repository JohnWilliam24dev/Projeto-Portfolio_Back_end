import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { parseAllowedOrigins } from './shared/auth/allowed-origins.util';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Mesma lista (e mesmo parse) do AllowedOriginGuard. Vazia = CORS bloqueia o navegador E o
  // guard devolve 403 em toda rota do site: fail-closed, então avisamos alto no boot.
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  if (allowedOrigins.length === 0) {
    new Logger('Bootstrap').warn('ALLOWED_ORIGINS vazio ou ausente: todas as rotas do site responderão 403.');
  }

  // Ampliado pra além do POST original: GET/PATCH (maker) e x-api-key (ApiKeyGuard)
  // agora existem e ficariam bloqueados no preflight sem isso.
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
  });

  // whitelist+forbidNonWhitelisted reproduz a rejeição de campo desconhecido/duplicado
  // que o multipartRequestParser.js fazia manualmente com Busboy.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
