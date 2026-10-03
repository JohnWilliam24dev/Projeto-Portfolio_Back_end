import { randomInt } from 'node:crypto';

// Alfabeto sem 0/O e 1/I: evita confusão visual quando o Guest ou o Maker forem digitar
// o token à mão pra consultar o pedido.
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const NUMEROS = '23456789';
const TOKEN_ALPHABET = LETRAS + NUMEROS;
export const TAMANHO_TOKEN_PEDIDO = 5;

// randomInt (CSPRNG do Node) em vez de Math.random(): o token é público e curto, mas gerá-lo
// com fonte imprevisível impede que alguém deduza os próximos a partir dos anteriores.
// Letras são 24 de 32 símbolos, então sem ajuste ~24% dos tokens sairiam só com letras.
// Rejeitamos e sorteamos de novo até ter ao menos uma letra e um número — a perda de espaço
// é pequena (~25% das combinações) e o unique index + retry do repositório cobre colisões.
function temLetraENumero(token: string): boolean {
  return [...token].some((c) => LETRAS.includes(c)) && [...token].some((c) => NUMEROS.includes(c));
}

export function gerarTokenPedido(): string {
  let token: string;
  do {
    token = '';
    for (let i = 0; i < TAMANHO_TOKEN_PEDIDO; i += 1) {
      token += TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)];
    }
  } while (!temLetraENumero(token));
  return token;
}
