import { SafeReferenceFile } from '../../shared/image/safe-reference-file';
import { Prisma } from '../../shared/prisma/prisma-client';

// Duas portas (Interface Segregation): quem cria pedido não precisa conhecer a consulta pública,
// e vice-versa. O adapter Prisma implementa as duas.
export const COMMISSION_REPOSITORY = Symbol('COMMISSION_REPOSITORY');
export const COMMISSION_CONSULTA_REPOSITORY = Symbol('COMMISSION_CONSULTA_REPOSITORY');

export interface AdicionalCatalogo {
  nome: string;
  habilitado: boolean;
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
}

export interface TipoProdutoCatalogo {
  id: string;
  makerId: string;
  nome: string;
  precoBase: Prisma.Decimal;
  habilitado: boolean;
  // chave = Adicional.id — só os adicionais VINCULADOS a este tipo (TipoProdutoAdicional);
  // qualquer id fora do mapa é inválido. A flag `habilitado` vem junto: a regra é do service.
  adicionaisVinculados: Map<string, AdicionalCatalogo>;
}

export interface AdicionalGravado {
  adicionalId: string;
  quantidade: number;
  descricaoCliente: string;
  valorUnitario: Prisma.Decimal;
}

export interface CriarCommissionInput {
  makerId: string;
  tipoProdutoId: string;
  nomeCliente: string;
  contato: string;
  email?: string;
  descricao: string;
  precoSimulado: Prisma.Decimal;
  /** Imagem já sanitizada; o repositório sobe pro storage e grava só a URL. */
  referenceFile: SafeReferenceFile;
  adicionais: AdicionalGravado[];
}

export interface CommissionCriada {
  id: string;
  token: string;
}

export interface CommissionPublicaRegistro {
  status: string;
  tipoProduto: string;
  precoSimulado: Prisma.Decimal;
  orcamentoFinal: Prisma.Decimal | null;
  criadoEm: Date;
}

export interface CommissionRepository {
  /** null se o tipo não existir — quem chama decide como isso vira erro. */
  buscarTipoProdutoComAdicionais(tipoProdutoId: string): Promise<TipoProdutoCatalogo | null>;

  /**
   * Sobe a imagem, grava Commission (status INICIAL do Maker, ao fim da coluna) + adicionais de
   * forma atômica e devolve o token. Falha ao gravar apaga a imagem órfã.
   */
  criar(input: CriarCommissionInput): Promise<CommissionCriada>;
}

export interface CommissionConsultaRepository {
  /** Devolve só os campos públicos; null se não existir. */
  buscarPublicaPorToken(token: string): Promise<CommissionPublicaRegistro | null>;
}
