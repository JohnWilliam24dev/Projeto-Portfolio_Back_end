import { Prisma } from '../shared/prisma/prisma-client';
import type { RegraPrecoAdicional } from './persistence/commission-repository.port';

export interface AdicionalComPreco {
  tipoAdicionalId: string;
  nome: string;
  descricao: string;
  valor: Prisma.Decimal;
}

// O CHECK constraint em tipos_adicional (porcentagem XOR valor_fixo) garante que um dos
// dois sempre existe — o `!` abaixo confia nessa garantia do banco, não é um chute.
export function calcularValorAdicional(precoMedio: Prisma.Decimal, regra: RegraPrecoAdicional): Prisma.Decimal {
  if (regra.valorFixo !== null) return regra.valorFixo;
  return precoMedio.mul(regra.porcentagem!).div(100);
}

export function somarPrecoSimulado(precoMedio: Prisma.Decimal, adicionais: AdicionalComPreco[]): Prisma.Decimal {
  return adicionais.reduce((total, adicional) => total.plus(adicional.valor), precoMedio);
}
