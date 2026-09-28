import { SafeReferenceFile } from '../../shared/image/safe-reference-file';
import { CommissionOrder } from '../commission.types';

// Mesma ideia de porta dos outros módulos: o service depende só disso, nunca do Prisma.
export const COMMISSION_REPOSITORY = Symbol('COMMISSION_REPOSITORY');

export interface CommissionRepository {
  /**
   * Sobe a imagem pro storage e grava o pedido (com a URL) no contrato legado; `orderId` vira
   * a PK. O buffer NÃO é consumido: o chamador segue usando `referenceFile` pro Telegram.
   */
  salvar(orderId: string, order: CommissionOrder, referenceFile: SafeReferenceFile): Promise<void>;
}
