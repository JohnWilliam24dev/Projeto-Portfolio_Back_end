import { parseAllowedOrigins } from '../src/shared/auth/allowed-origins.util';

describe('parseAllowedOrigins', () => {
  it('separa por vírgula, remove espaços e barra final, e põe em minúsculas', () => {
    expect(parseAllowedOrigins(' HTTPS://Site.com/ , https://www.site.com ')).toEqual([
      'https://site.com',
      'https://www.site.com',
    ]);
  });

  it('descarta entradas vazias e duplicadas', () => {
    expect(parseAllowedOrigins('https://a.com,,https://a.com/, /')).toEqual(['https://a.com']);
  });

  it('devolve lista vazia quando ausente ou em branco', () => {
    expect(parseAllowedOrigins(undefined)).toEqual([]);
    expect(parseAllowedOrigins('')).toEqual([]);
    expect(parseAllowedOrigins('  ,  ')).toEqual([]);
  });

  it('mantém a porta como parte da origem', () => {
    expect(parseAllowedOrigins('http://localhost:5173')).toEqual(['http://localhost:5173']);
  });
});
