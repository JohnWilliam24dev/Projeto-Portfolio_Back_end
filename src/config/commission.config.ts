export const MAX_REFERENCE_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;

export interface ImageSignature {
  signature?: number[];
}

export const REFERENCE_IMAGE_TYPES = new Map<string, ImageSignature>([
  ['image/jpeg', { signature: [0xff, 0xd8, 0xff] }],
  ['image/png', { signature: [137, 80, 78, 71, 13, 10, 26, 10] }],
  ['image/webp', {}],
]);

// O catálogo (nome/preço de TipoProduto e TipoAdicional) agora vive no banco, configurado
// pelo Maker — não existe mais uma lista fixa tipo MODEL_LABELS aqui. O que continua sendo
// regra de aplicação (não de catálogo) é o teto de itens por submissão, defesa contra abuso.
export const MAX_ADICIONAIS_POR_PRODUTO = 20;
export const MAX_DESCRICAO_LENGTH = 1_000;
