import { Prisma } from '../../shared/prisma/prisma-client';

export const TIPO_PRODUTO_REPOSITORY = Symbol('TIPO_PRODUTO_REPOSITORY');

export interface TipoProdutoRegistro {
  id: string;
  nome: string;
  precoBase: Prisma.Decimal;
  habilitado: boolean;
  criadoEm: Date;
  /** Adicionais vinculados a este tipo (TipoProdutoAdicional). */
  adicionalIds: string[];
}

export interface CriarTipoProdutoInput {
  nome: string;
  precoBase: Prisma.Decimal;
  habilitado: boolean;
}

export interface AtualizarTipoProdutoInput {
  nome?: string;
  precoBase?: Prisma.Decimal;
  habilitado?: boolean;
}

// REGRA DE ISOLAMENTO (SGA 5.1): todo método recebe `makerId` e filtra por ele no banco. Um id que
// existe mas é de outro Maker é indistinguível de um id inexistente (null / NotFoundError).
export interface TipoProdutoRepository {
  listar(makerId: string): Promise<TipoProdutoRegistro[]>;
  buscarPorId(makerId: string, id: string): Promise<TipoProdutoRegistro | null>;
  criar(makerId: string, input: CriarTipoProdutoInput): Promise<TipoProdutoRegistro>;
  atualizar(makerId: string, id: string, input: AtualizarTipoProdutoInput): Promise<TipoProdutoRegistro>;
  /** true se já há pedido OU item de portfólio usando este tipo: nesse caso não pode ser excluído. */
  temDependencias(makerId: string, id: string): Promise<boolean>;
  excluir(makerId: string, id: string): Promise<void>;
  /** Substitui o conjunto de adicionais vinculados (apaga os antigos e grava os novos, atomicamente). */
  definirAdicionais(makerId: string, id: string, adicionalIds: string[]): Promise<void>;
}
