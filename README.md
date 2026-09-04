# API de pedidos de comissão

Função serverless para Vercel que recebe um pedido e sua imagem de referência, valida o conteúdo do arquivo e envia os dados ao Telegram do artista. Ela não grava nem devolve o arquivo ao navegador.

## Estrutura

```text
api/commission.js       adaptador mínimo da Vercel
src/controllers/        HTTP: CORS, método e respostas
src/services/           caso de uso e normalização segura da imagem
src/validators/         regras e validação do pedido
src/gateways/           adaptadores externos (Telegram hoje)
src/parsers/            leitura protegida do multipart
src/factories/          composição das dependências
```

O serviço depende apenas da porta `notificationGateway.notify(payload)`. Um gateway de e-mail ou WhatsApp pode ser adicionado sem alterar controller, validação ou a regra do pedido.

## Segurança aplicada

- Aceita somente **uma** imagem PNG, JPEG ou WebP de até 5 MB.
- Confere a assinatura binária do arquivo; tipo e extensão informados pelo navegador não são confiáveis.
- Recusa PDF, SVG e qualquer outro formato que possa transportar script/conteúdo ativo.
- Impõe limites para campos e partes do formulário, rejeita campos duplicados e remove caracteres de controle dos textos.
- Mantém token do Telegram apenas no servidor e restringe CORS aos domínios declarados em `ALLOWED_ORIGINS`.

## Desenvolvimento e publicação

```bash
npm install
cp .env.example .env.local
npm run dev
```

Na Vercel, importe este repositório como um projeto separado. Configure `ALLOWED_ORIGINS`, `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` em **Settings → Environment Variables** para Preview e Production, depois faça novo deploy.

Para obter o `TELEGRAM_CHAT_ID`, envie uma mensagem ao bot e abra `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` uma única vez no navegador. Copie `message.chat.id` e remova a URL do histórico. Nunca envie token para o frontend, Git ou chat.

<!-- teste de push automatizado via Claude: 04/09/2026 -->
