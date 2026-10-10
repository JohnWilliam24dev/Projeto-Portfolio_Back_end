import { regraParaAtualizacao, regraParaCriacao } from '../src/catalogo/adicional-preco.util';
import { ValidationError } from '../src/shared/errors/domain.errors';

describe('adicional-preco.util', () => {
  describe('regraParaCriacao', () => {
    it('aceita só preço fixo (porcentagem vira null)', () => {
      const regra = regraParaCriacao({ precoFixo: 19.99 });
      expect(regra.precoFixo?.toFixed(2)).toBe('19.99');
      expect(regra.porcentagem).toBeNull();
    });

    it('aceita só porcentagem (preço fixo vira null)', () => {
      const regra = regraParaCriacao({ porcentagem: 15 });
      expect(regra.porcentagem?.toFixed(2)).toBe('15.00');
      expect(regra.precoFixo).toBeNull();
    });

    it('preço fixo ZERO é uma regra válida (não confunde 0 com ausente)', () => {
      expect(regraParaCriacao({ precoFixo: 0 }).precoFixo?.toFixed(2)).toBe('0.00');
    });

    it.each([
      ['nenhum dos dois', {}],
      ['os dois', { precoFixo: 10, porcentagem: 10 }],
    ])('rejeita %s', (_nome, entrada) => {
      expect(() => regraParaCriacao(entrada)).toThrow(ValidationError);
    });
  });

  describe('regraParaAtualizacao', () => {
    it('nenhum informado: o preço não muda (undefined)', () => {
      expect(regraParaAtualizacao({})).toBeUndefined();
    });

    it('informar o fixo TROCA a regra: a porcentagem é zerada', () => {
      const regra = regraParaAtualizacao({ precoFixo: 30 })!;
      expect(regra.precoFixo?.toFixed(2)).toBe('30.00');
      expect(regra.porcentagem).toBeNull();
    });

    it('informar a porcentagem TROCA a regra: o fixo é zerado', () => {
      const regra = regraParaAtualizacao({ porcentagem: 12 })!;
      expect(regra.porcentagem?.toFixed(2)).toBe('12.00');
      expect(regra.precoFixo).toBeNull();
    });

    it('informar os dois é ambíguo e é rejeitado', () => {
      expect(() => regraParaAtualizacao({ precoFixo: 1, porcentagem: 1 })).toThrow(ValidationError);
    });
  });
});
