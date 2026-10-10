import { Prisma } from '../prisma/prisma-client';

export interface RegraPrecoAdicional {
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
}

export interface ItemPreco {
  valorUnitario: Prisma.Decimal;
  quantidade: number;
}

/**
 * Valor de UMA unidade do adicional, já arredondado a 2 casas (ROUND_HALF_UP).
 * O arredondamento acontece AQUI, antes de multiplicar pela quantidade, e não no Postgres na
 * hora de gravar: assim o `valor_unitario` gravado (snapshot) é exatamente o que entrou na soma,
 * e Σ(valor_unitario × quantidade) sempre bate com o preco_simulado.
 */
export function calcularValorUnitario(precoBase: Prisma.Decimal, regra: RegraPrecoAdicional): Prisma.Decimal {
  let bruto: Prisma.Decimal;
  if (regra.precoFixo !== null) {
    bruto = regra.precoFixo;
  } else if (regra.porcentagem !== null) {
    bruto = precoBase.mul(regra.porcentagem).div(100);
  } else {
    // O CHECK chk_adicional_regra_preco impede isso no banco; se acontecer, é dado corrompido.
    throw new Error('Adicional sem regra de preço (viola chk_adicional_regra_preco).');
  }
  return bruto.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function calcularPrecoSimulado(precoBase: Prisma.Decimal, itens: ItemPreco[]): Prisma.Decimal {
  return itens.reduce((total, item) => total.plus(item.valorUnitario.mul(item.quantidade)), precoBase);
}
