import { ValidationError } from '../shared/errors/domain.errors';
import { Prisma } from '../shared/prisma/prisma-client';

export interface EntradaDePreco {
  precoFixo?: number;
  porcentagem?: number;
}

export interface RegraDePreco {
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
}

// Regra do adicional: exatamente UM entre preço fixo e porcentagem. O CHECK do banco
// (chk_adicional_regra_preco) é a rede de segurança; esta função dá o erro legível antes dele.
export function regraParaCriacao(entrada: EntradaDePreco): RegraDePreco {
  const temFixo = entrada.precoFixo !== undefined;
  const temPorcentagem = entrada.porcentagem !== undefined;
  if (temFixo === temPorcentagem) {
    throw new ValidationError('Informe o preço fixo OU a porcentagem (apenas um dos dois).');
  }
  return {
    precoFixo: temFixo ? new Prisma.Decimal(entrada.precoFixo as number) : null,
    porcentagem: temPorcentagem ? new Prisma.Decimal(entrada.porcentagem as number) : null,
  };
}

// Na edição, informar um dos dois TROCA a regra: o outro é zerado (null), senão o CHECK recusaria
// o registro com os dois preenchidos. Nenhum informado = preço não muda (undefined).
export function regraParaAtualizacao(entrada: EntradaDePreco): RegraDePreco | undefined {
  const temFixo = entrada.precoFixo !== undefined;
  const temPorcentagem = entrada.porcentagem !== undefined;
  if (temFixo && temPorcentagem) throw new ValidationError('Informe apenas um: preço fixo ou porcentagem.');
  if (!temFixo && !temPorcentagem) return undefined;
  return regraParaCriacao(entrada);
}
