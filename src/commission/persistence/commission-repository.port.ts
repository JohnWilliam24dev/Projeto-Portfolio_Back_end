import { CommissionOrder } from '../commission.types';

// Mesma ideia de porta dos outros módulos: o service depende só disso, nunca do Prisma.
export const COMMISSION_REPOSITORY = Symbol('COMMISSION_REPOSITORY');

export interface CommissionRepository {
  /** Grava o pedido no contrato legado; `orderId` vira a PK da linha. */
  salvar(orderId: string, order: CommissionOrder): Promise<void>;
}
