import { SafeReferenceFile } from '../../shared/image/safe-reference-file';
import { CommissionLegadoOrder } from '../commission-legado.types';

// Mesma ideia de porta dos outros módulos: o service depende só disso, nunca do Prisma.
export const COMMISSION_LEGADO_REPOSITORY = Symbol('COMMISSION_LEGADO_REPOSITORY');

export interface CommissionLegadoRepository {
  /**
   * Sobe a imagem pro storage e grava o pedido (com a URL) no contrato legado; `orderId` vira
   * a PK. O buffer NÃO é consumido: o chamador segue usando `referenceFile` pro Telegram.
   */
  salvar(orderId: string, order: CommissionLegadoOrder, referenceFile: SafeReferenceFile): Promise<void>;
}
