import { SafeReferenceFile } from '../shared/image/safe-reference-file';

export interface CommissionLegadoOrder {
  nickname: string;
  contact: string;
  modelType: string;
  additionalContentNotes: string;
  acessorios: number;
  expressoesExtras: number;
}

export interface NotifyPayload {
  orderId: string;
  order: CommissionLegadoOrder;
  referenceFile: SafeReferenceFile;
}
