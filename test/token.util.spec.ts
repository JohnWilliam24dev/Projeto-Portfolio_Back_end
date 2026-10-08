import { gerarTokenPedido, TAMANHO_TOKEN_PEDIDO, tokenPedidoValido } from '../src/shared/token/token.util';

describe('gerarTokenPedido', () => {
  it('gera tokens com o tamanho esperado e só com caracteres do alfabeto sem ambiguidade', () => {
    for (let i = 0; i < 500; i += 1) {
      expect(gerarTokenPedido()).toMatch(new RegExp(`^[A-HJ-NP-Z2-9]{${TAMANHO_TOKEN_PEDIDO}}$`));
    }
  });

  it('sempre mistura ao menos uma letra e um número', () => {
    for (let i = 0; i < 1_000; i += 1) {
      const token = gerarTokenPedido();
      expect(token).toMatch(/[A-Z]/);
      expect(token).toMatch(/[2-9]/);
    }
  });

  it('não repete tokens em sequência curta (sanidade da aleatoriedade)', () => {
    const tokens = new Set(Array.from({ length: 200 }, () => gerarTokenPedido()));
    expect(tokens.size).toBeGreaterThan(190);
  });
});

describe('tokenPedidoValido', () => {
  it('aceita tokens gerados pela própria aplicação', () => {
    for (let i = 0; i < 200; i += 1) expect(tokenPedidoValido(gerarTokenPedido())).toBe(true);
  });

  it.each([
    ['curto demais', 'AB23'],
    ['comprido demais', 'AB23CD'],
    ['com caractere ambíguo excluído do alfabeto (O)', 'ABO23'],
    ['com caractere ambíguo excluído do alfabeto (1)', 'AB123'],
    ['minúsculo (a normalização é do service)', 'ab23c'],
    ['com símbolo', 'AB-23'],
    ['vazio', ''],
  ])('rejeita token %s', (_nome, token) => {
    expect(tokenPedidoValido(token)).toBe(false);
  });
});
