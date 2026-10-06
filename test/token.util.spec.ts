import { gerarTokenPedido, TAMANHO_TOKEN_PEDIDO } from '../src/produto/persistence/token.util';

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
