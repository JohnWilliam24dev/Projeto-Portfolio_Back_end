import { Prisma } from '../src/shared/prisma/prisma-client';
import { calcularPrecoSimulado, calcularValorUnitario } from '../src/commission/pricing.util';

const D = (valor: string | number) => new Prisma.Decimal(valor);

describe('pricing.util', () => {
  describe('calcularValorUnitario', () => {
    it('usa o preço fixo quando o adicional é de valor fixo', () => {
      expect(calcularValorUnitario(D(100), { precoFixo: D(20), porcentagem: null }).toFixed(2)).toBe('20.00');
    });

    it('porcentagem incide sobre o preço base do tipo (20% vale 20 num tipo de 100 e 60 num de 300)', () => {
      const regra = { precoFixo: null, porcentagem: D(20) };
      expect(calcularValorUnitario(D(100), regra).toFixed(2)).toBe('20.00');
      expect(calcularValorUnitario(D(300), regra).toFixed(2)).toBe('60.00');
    });

    it('arredonda 2 casas com ROUND_HALF_UP (1,005 vira 1,01; nem float nem arredondamento bancário)', () => {
      expect(calcularValorUnitario(D('100.50'), { precoFixo: null, porcentagem: D(1) }).toFixed(2)).toBe('1.01');
    });

    it('preço fixo zero é válido (não confunde 0 com ausente)', () => {
      expect(calcularValorUnitario(D(100), { precoFixo: D(0), porcentagem: null }).toFixed(2)).toBe('0.00');
    });

    it('falha alto se o adicional não tem nenhuma regra (dado que o CHECK do banco deveria impedir)', () => {
      expect(() => calcularValorUnitario(D(100), { precoFixo: null, porcentagem: null })).toThrow();
    });
  });

  describe('calcularPrecoSimulado', () => {
    it('sem adicionais, o preço é o preço base', () => {
      expect(calcularPrecoSimulado(D('99.90'), []).toFixed(2)).toBe('99.90');
    });

    it('soma preço base + Σ(valor unitário × quantidade)', () => {
      const total = calcularPrecoSimulado(D(100), [
        { valorUnitario: D(20), quantidade: 2 },
        { valorUnitario: D(10), quantidade: 1 },
      ]);
      expect(total.toFixed(2)).toBe('150.00');
    });

    it('arredonda o unitário ANTES de multiplicar: a soma dos snapshots bate com o preço simulado', () => {
      // 15% de 33,33 = 4,9995 -> 5,00 por unidade. Se multiplicasse antes de arredondar (x3 =
      // 14,9985 -> 15,00) o resultado coincidiria aqui, mas com outros valores divergiria; o
      // contrato é: o que é gravado (unitário arredondado) é exatamente o que entra na soma.
      const base = D('33.33');
      const unitario = calcularValorUnitario(base, { precoFixo: null, porcentagem: D(15) });
      expect(unitario.toFixed(2)).toBe('5.00');

      const total = calcularPrecoSimulado(base, [{ valorUnitario: unitario, quantidade: 3 }]);
      expect(total.toFixed(2)).toBe('48.33');
      expect(total.minus(base).equals(unitario.mul(3))).toBe(true);
    });

    it('caso em que arredondar antes e depois de multiplicar DIVERGE: vale o unitário arredondado', () => {
      // 1,005 -> 1,01 por unidade; x3 = 3,03 (e não 3,015 -> 3,02 se arredondasse depois).
      const base = D('100.50');
      const unitario = calcularValorUnitario(base, { precoFixo: null, porcentagem: D(1) });
      const total = calcularPrecoSimulado(base, [{ valorUnitario: unitario, quantidade: 3 }]);
      expect(total.minus(base).toFixed(2)).toBe('3.03');
    });
  });
});
