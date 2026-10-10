import { Prisma } from '../../shared/prisma/prisma-client';

export const ADICIONAL_REPOSITORY = Symbol('ADICIONAL_REPOSITORY');

export interface AdicionalRegistro {
  id: string;
  nome: string;
  descricao: string | null;
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
  habilitado: boolean;
  criadoEm: Date;
}

export interface CriarAdicionalInput {
  nome: string;
  descricao: string | null;
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
  habilitado: boolean;
}

// `undefined` = não altera; `null` = grava NULL (é assim que a troca fixo <-> porcentagem limpa o outro).
export interface AtualizarAdicionalInput {
  nome?: string;
  descricao?: string | null;
  precoFixo?: Prisma.Decimal | null;
  porcentagem?: Prisma.Decimal | null;
  habilitado?: boolean;
}

// Mesma regra de isolamento do tipo de produto: `makerId` obrigatório e filtrado no banco.
export interface AdicionalRepository {
  listar(makerId: string): Promise<AdicionalRegistro[]>;
  buscarPorId(makerId: string, id: string): Promise<AdicionalRegistro | null>;
  criar(makerId: string, input: CriarAdicionalInput): Promise<AdicionalRegistro>;
  atualizar(makerId: string, id: string, input: AtualizarAdicionalInput): Promise<AdicionalRegistro>;
  /** true se algum pedido já usou este adicional: nesse caso não pode ser excluído. */
  temUso(makerId: string, id: string): Promise<boolean>;
  excluir(makerId: string, id: string): Promise<void>;
  /** Quantos dos ids informados existem E pertencem a este Maker. */
  contarPorIds(makerId: string, ids: string[]): Promise<number>;
}
