# Esqueleto de migração para NestJS (experimental)

Este diretório é uma **prova de conceito isolada**, criada para avaliação. Ele NÃO substitui
a implementação atual em `api/` e `src/` na raiz do projeto (que continua sendo a versão em
produção). A ideia é reproduzir a mesma arquitetura de portas/adapters já usada no projeto,
só que expressa com os primitivos do Nest (módulos, DI, pipes, filters) em vez de factories
manuais.

**Status:** já compila (`npm run build`) e os testes passam (`npm test`) de verdade — não é
mais só estrutura de arquivos, dá pra rodar (`npm install && npm run start:dev`) e bater um
`POST /commission` local.

## Convenção de facade

Todo módulo deste projeto expõe **uma única facade**, e ela é o único export que sai do módulo
para o resto da aplicação:

```
commission/
├── index.ts                 ← barrel: só exporta CommissionModule, CommissionFacade e o DTO
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
- Fora do módulo, o import correto é sempre `import { CommissionFacade } from '../commission'`
  (via barrel), nunca apontando pro arquivo interno.
- Quando o módulo crescer (ex: um segundo use case, tipo "listar pedidos"), o método novo entra
  na facade (`commissionFacade.listOrders()`) chamando um service novo por trás — o consumidor
  externo nunca percebe a mudança de implementação.

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
│   │   ├── index.ts                              barrel: só exporta a facade + Module + DTO
│   │   ├── commission.facade.ts                  único export do módulo em runtime
│   │   ├── commission.module.ts                  liga porta -> adapter via DI
│   │   ├── commission.controller.ts              equivalente a commissionController.js (usa a facade)
│   │   ├── commission.service.ts                 equivalente a commissionService.js (interno)
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

## Rodando localmente

```bash
cd nestjs-migration
npm install
npm run build   # confirma que compila
npm test        # roda commission.service.spec.ts e commission.facade.spec.ts
npm run start:dev
```

## Próximos passos, se a migração for aprovada

1. Portar os testes de validação que ainda só existem no lado JS
   (`test/commissionRequestValidator.test.js` — casos de assinatura binária inválida, honeypot,
   quantidade não numérica) para specs do DTO/pipe aqui dentro.
2. Promover esta pasta pra raiz do repo (ou o inverso: mover o conteúdo atual pra `legacy/`)
   e ajustar o `vercel.json` pra apontar pro `src/main.ts` do Nest.
3. Confirmar que a Vercel reconhece o entrypoint do Nest sem config extra (zero-config para
   frameworks Node suportados), rodando `vercel dev` localmente antes do primeiro deploy real.
4. Só então aposentar `api/commission.js` e o restante do `src/` atual na raiz.
