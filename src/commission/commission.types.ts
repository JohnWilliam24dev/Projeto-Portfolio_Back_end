import { SafeReferenceFile } from '../shared/image/safe-reference-file';
import { Prisma } from '../shared/prisma/prisma-client';

export interface AdicionalDoPedido {
  adicionalId: string;
  nome: string;
  quantidade: number;
  descricaoCliente: string;
  /** Snapshot do preço de UMA unidade, já arredondado. */
  valorUnitario: Prisma.Decimal;
}

// "Retrato" já resolvido do pedido (nomes de catálogo, valores calculados): o gateway não faz
// consulta própria, só formata e envia o que o service apurou.
export interface NotifyPayload {
  token: string;
  tipoProdutoNome: string;
  nomeCliente: string;
  contato: string;
  email?: string;
  descricao: string;
  adicionais: AdicionalDoPedido[];
  precoSimulado: Prisma.Decimal;
  referenceFile: SafeReferenceFile;
}

// Resposta da consulta pública por token: SÓ o necessário. Nunca contato, e-mail, imagem de
// referência ou dados do Maker. Valores monetários como string "0.00" (sem float no caminho).
export interface CommissionPublica {
  status: string;
  tipoProduto: string;
  precoSimulado: string;
  orcamentoFinal: string | null;
  criadoEm: string;
}
