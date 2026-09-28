import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SECRET_BYTES = 32;
const DELIMITADOR = '.';

/**
 * Formato da chave: `{makerId}.{segredo}`. O makerId (UUID já existente, já indexado como PK)
 * serve de identificador de busca — não é sensível, só diz "qual linha olhar". Quem prova a
 * identidade é o segredo, verificado por hash. Isso evita ter que escanear/comparar hash
 * contra toda a tabela de Makers a cada request.
 */
export function gerarSegredoApiKey(): string {
  return randomBytes(SECRET_BYTES).toString('base64url');
}

/**
 * SHA-256 (hash rápido), não bcrypt/argon2: essas funções lentas existem pra dificultar
 * força bruta contra segredos de BAIXA entropia (senhas humanas). Aqui o segredo já nasce
 * com 256 bits de aleatoriedade — hash lento não agrega segurança nenhuma, só custo de CPU.
 */
export function hashSegredoApiKey(segredo: string): string {
  return createHash('sha256').update(segredo).digest('hex');
}

export function segredoConfereComHash(segredo: string, hashArmazenado: string): boolean {
  const recebido = Buffer.from(hashSegredoApiKey(segredo), 'hex');
  const esperado = Buffer.from(hashArmazenado, 'hex');
  // Tamanhos diferentes quebrariam timingSafeEqual (exige buffers do mesmo tamanho) —
  // e retornar false aqui não vaza nada de útil sobre o hash esperado.
  if (recebido.length !== esperado.length) return false;
  return timingSafeEqual(recebido, esperado);
}

export function montarApiKey(makerId: string, segredo: string): string {
  return `${makerId}${DELIMITADOR}${segredo}`;
}

export function separarApiKey(apiKey: string): { makerId: string; segredo: string } | null {
  const indice = apiKey.indexOf(DELIMITADOR);
  if (indice <= 0 || indice === apiKey.length - 1) return null;
  return { makerId: apiKey.slice(0, indice), segredo: apiKey.slice(indice + 1) };
}
