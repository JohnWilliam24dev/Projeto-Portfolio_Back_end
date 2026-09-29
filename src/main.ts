import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';

function readAllowedOrigins(value: string | undefined): string[] {
  return (value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Ampliado pra além do POST original: GET/PATCH (maker) e x-api-key (ApiKeyGuard)
  // agora existem e ficariam bloqueados no preflight sem isso.
  app.enableCors({
    origin: readAllowedOrigins(process.env.ALLOWED_ORIGINS),
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
