// Regras da imagem de referência — compartilhadas por /commission (legado) e /produto.
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
