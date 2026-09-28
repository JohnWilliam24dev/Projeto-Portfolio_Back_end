// Alfabeto sem 0/O e 1/I: evita confusão visual quando o Guest ou o Maker forem digitar
// o token à mão pra consultar o pedido. Math.random() é suficiente aqui — isto é um
// código curto de consulta pública, não um segredo/credencial (autenticação não depende dele).
const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TAMANHO_TOKEN_PEDIDO = 5;

export function gerarTokenPedido(): string {
  let token = '';
  for (let i = 0; i < TAMANHO_TOKEN_PEDIDO; i += 1) {
    token += TOKEN_ALPHABET[Math.floor(Math.random() * TOKEN_ALPHABET.length)];
  }
  return token;
}
