// Regras de aplicação do pedido público (não são catálogo: o catálogo vive no banco, configurado
// pelo Maker). São tetos de defesa contra abuso por submissão.
export const MAX_ADICIONAIS_POR_COMMISSION = 20; // itens DISTINTOS por pedido
export const MAX_QUANTIDADE_ADICIONAL = 20; // `quantidade` de cada adicional
export const MAX_DESCRICAO_LENGTH = 1_000;
export const MAX_EMAIL_LENGTH = 254;
// Telegram rejeita legenda de mídia acima disso (sendPhoto → 400).
export const TELEGRAM_CAPTION_LIMIT = 1_024;
