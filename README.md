# API de pedidos de comissão (NestJS)

Backend para Vercel que recebe um pedido de comissão e sua imagem de referência, valida o
conteúdo do arquivo, sanitiza a imagem e envia os dados ao Telegram do artista. Não grava nem
devolve o arquivo ao navegador — é stateless por design.

> Migrado da implementação original em JavaScript puro (factories manuais) para NestJS,
> mantendo a mesma arquitetura de portas/adapters, o mesmo comportamento de segurança e a
> mesma cobertura de testes. O histórico da versão anterior continua disponível nos commits
> antes desta migração.

## Convenção de facade

Todo módulo deste projeto expõe **uma única facade**, e ela é o único export que sai do módulo
para o resto da aplicação:

```
commission/
├── index.ts                  ← barrel: só exporta CommissionModule, CommissionFacade e o DTO
├── commission.facade.ts      ← ÚNICO ponto de entrada público em runtime
├── commission.module.ts      ← providers: tudo | exports: [CommissionFacade]
├── commission.controller.ts  ← injeta CommissionFacade, nunca CommissionService
├── commission.service.ts     ← interno, não sai do módulo
├── image/, notification/     ← internos, não saem do módulo
```

Regras práticas:
- O `@Module()` só coloca a facade em `exports: []`. `CommissionService`, `ImageSanitizerService`
  e o `NOTIFICATION_GATEWAY` ficam disponíveis só dentro do módulo — se outro módulo tentar
  importar `CommissionModule` e injetar `CommissionService` direto, o Nest recusa no bootstrap.
- Fora do módulo, o import correto é sempre `import { CommissionFacade } from './commission'`
  (via barrel), nunca apontando pro arquivo interno.
- Quando o módulo crescer (ex: um segundo use case, tipo "listar pedidos"), o método novo entra
  na facade (`commissionFacade.listOrders()`) chamando um service novo por trás — o consumidor
  externo nunca percebe a mudança de implementação.
- **Todo módulo novo do projeto segue essa mesma regra**, não só o de comissão.

## Estrutura

```text
src/
├── main.ts                                        bootstrap: CORS, ValidationPipe, exception filter
├── app.module.ts                                   módulo raiz
├── config/
│   └── commission.config.ts                        limites de arquivo/pixels, labels dos modelos
├── commission/
│   ├── index.ts                                    barrel público (ver seção acima)
│   ├── commission.facade.ts                        único export do módulo em runtime
│   ├── commission.module.ts                         liga porta -> adapter via DI
│   ├── commission.controller.ts                     rota POST /commission (usa a facade)
│   ├── commission.service.ts                        caso de uso (interno)
│   ├── dto/create-commission.dto.ts                 validação de campos (class-validator)
│   ├── validators/reference-image.pipe.ts           checagem de magic bytes do arquivo
│   ├── image/image-sanitizer.service.ts             reencode via sharp (remove metadados/EXIF)
│   └── notification/
│       ├── notification-gateway.port.ts             a "porta" (interface)
│       └── telegram-notification.gateway.ts         adapter concreto (Telegram)
└── shared/
    ├── errors/domain.errors.ts                      ValidationError, PayloadTooLargeError, IntegrationError
    └── filters/http-exception.filter.ts              captura erros e formata a resposta HTTP
```

## Segurança aplicada

- Aceita somente **uma** imagem PNG, JPEG ou WebP de até 5 MB (`ReferenceImagePipe`).
- Confere a assinatura binária (magic bytes) do arquivo; o `mimetype` informado pelo navegador
  não é confiável e nunca é usado sozinho pra decidir se o arquivo é uma imagem de verdade.
- Reencoda a imagem via `sharp` antes de repassar (`ImageSanitizerService`), o que descarta
  metadados/EXIF e qualquer payload malicioso escondido no arquivo original.
- Honeypot (`website`) e `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
  rejeitam campo extra/preenchido por bot, equivalente ao comportamento anterior em Busboy.
- CORS restrito aos domínios declarados em `ALLOWED_ORIGINS`; token do Telegram só existe no
  servidor, nunca é exposto ao frontend.

## Desenvolvimento

```bash
npm install
cp .env.example .env
npm run start:dev
```

```bash
npm run build   # confirma que compila
npm test        # roda toda a suíte (service, facade, DTO, pipe de imagem)
```

## Deploy na Vercel

A Vercel detecta NestJS com **zero-config**: reconhece `src/main.ts` como entrypoint e builda
como uma única Vercel Function em Fluid Compute — não é mais necessário declarar
`builds`/`routes` manuais como no modelo antigo de function única (`api/commission.js`).

Este repo tem um `vercel.json` mínimo, só com `"framework": "nestjs"`. Isso existe porque
Framework Preset e Output Directory no dashboard da Vercel são **configuração do projeto
inteiro**, compartilhada entre todas as branches — e enquanto a `main` ainda estiver rodando a
implementação antiga (`api/commission.js`, sem `src/main.ts`), o deploy dela ressincroniza esse
dropdown pra "Other", derrubando a detecção que essa branch precisa. Declarar o framework
explicitamente no `vercel.json` faz esse override valer por commit, sem depender do estado
global do projeto no dashboard.

> Depois que esta branch virar a `main` de verdade (e o código antigo sumir de vez), esse
> `vercel.json` deixa de ser estritamente necessário — mas não faz mal deixá-lo.

Configure `ALLOWED_ORIGINS`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` em
**Settings → Environment Variables** para Preview e Production.

Para obter o `TELEGRAM_CHAT_ID`, envie uma mensagem ao bot e abra
`https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` uma única vez no navegador. Copie
`message.chat.id` e remova a URL do histórico. Nunca envie token para o frontend, Git ou chat.
