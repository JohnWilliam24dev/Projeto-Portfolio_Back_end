# Esqueleto de migração para NestJS (experimental)

Este diretório é uma **prova de conceito isolada**, criada para avaliação. Ele NÃO substitui
a implementação atual em `api/` e `src/` na raiz do projeto (que continua sendo a versão em
produção). A ideia é reproduzir a mesma arquitetura de portas/adapters já usada no projeto,
só que expressa com os primitivos do Nest (módulos, DI, pipes, filters) em vez de factories
manuais.

## Por que este esqueleto existe

- Validar se a estrutura modular do Nest se encaixa bem no domínio de comissões antes de
  qualquer decisão de migração real.
- Manter 1:1 a lógica de negócio já testada (validação de pedido, checagem de assinatura
  binária da imagem, sanitização via sharp, notificação via Telegram como implementação de
  uma porta `NotificationGateway`).
- Servir de referência de código para quem for revisar a decisão de arquitetura.

## O que NÃO está aqui (de propósito)

- Não está conectado ao `vercel.json` da raiz nem faz parte do deploy atual.
- Não tem `node_modules` nem lockfile — é esqueleto de estrutura e contratos, não app rodável
  "out of the box" ainda (falta configurar `nest-cli.json`, instalar deps, etc.).
- Não decide sozinho a migração — é insumo para a conversa, não uma imposição de arquitetura.

## Estrutura

```text
nestjs-migration/
├── src/
│   ├── main.ts                                  bootstrap padrão do Nest
│   ├── app.module.ts                             módulo raiz
│   ├── config/
│   │   └── commission.config.ts                  equivalente a src/config/commission.js
│   ├── commission/
│   │   ├── commission.module.ts                  liga porta -> adapter via DI
│   │   ├── commission.controller.ts              equivalente a commissionController.js
│   │   ├── commission.service.ts                 equivalente a commissionService.js
│   │   ├── dto/create-commission.dto.ts          parte do validator (campos)
│   │   ├── validators/reference-image.pipe.ts    checagem de magic bytes (pipe)
│   │   ├── image/image-sanitizer.service.ts      equivalente a referenceImageSanitizer.js
│   │   └── notification/
│   │       ├── notification-gateway.port.ts      a "porta" (interface)
│   │       └── telegram-notification.gateway.ts  adapter concreto (equivalente ao gateway atual)
│   └── shared/
│       ├── errors/*.ts                           equivalente a HttpError.js
│       └── filters/http-exception.filter.ts       captura os erros e formata a resposta HTTP
└── test/
    └── commission.service.spec.ts                exemplo de teste com DI do Nest
```

## Próximos passos, se a migração for aprovada

1. `nest new` de verdade dentro desta pasta (ou promovê-la pra raiz), instalar
   `@nestjs/platform-express`, `@nestjs/config`, `class-validator`, `class-transformer`, `sharp`.
2. Portar os testes existentes (`test/commissionService.test.js`,
   `test/commissionRequestValidator.test.js`) para o padrão `@nestjs/testing`.
3. Confirmar que a Vercel reconhece `src/main.ts` do Nest sem config extra (zero-config para
   frameworks Node suportados), rodando `vercel dev` localmente antes do primeiro deploy.
4. Só então aposentar `api/commission.js` e o restante do `src/` atual.
