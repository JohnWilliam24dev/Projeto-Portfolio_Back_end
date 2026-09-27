import {
  gerarSegredoApiKey,
  hashSegredoApiKey,
  montarApiKey,
  segredoConfereComHash,
  separarApiKey,
} from '../src/shared/auth/api-key.util';

describe('api-key.util', () => {
  it('monta e separa a chave de volta em makerId + segredo', () => {
    const segredo = gerarSegredoApiKey();
    const chave = montarApiKey('maker-1', segredo);

    const partes = separarApiKey(chave);

    expect(partes).toEqual({ makerId: 'maker-1', segredo });
  });

  it('confere um segredo contra o hash correto', () => {
    const segredo = gerarSegredoApiKey();
    const hash = hashSegredoApiKey(segredo);

    expect(segredoConfereComHash(segredo, hash)).toBe(true);
  });

  it('rejeita um segredo que não bate com o hash', () => {
    const hash = hashSegredoApiKey(gerarSegredoApiKey());

    expect(segredoConfereComHash(gerarSegredoApiKey(), hash)).toBe(false);
  });

  it('rejeita chave sem delimitador', () => {
    expect(separarApiKey('sem-delimitador')).toBeNull();
  });

  it('rejeita chave com segredo vazio', () => {
    expect(separarApiKey('maker-1.')).toBeNull();
  });

  it('gera segredos diferentes a cada chamada', () => {
    expect(gerarSegredoApiKey()).not.toBe(gerarSegredoApiKey());
  });
});
