import { SafeReferenceFile } from '../shared/image/safe-reference-file';

export interface CommissionOrder {
  nickname: string;
  contact: string;
  modelType: string;
  additionalContentNotes: string;
  acessorios: number;
  expressoesExtras: number;
}

export interface NotifyPayload {
  orderId: string;
  order: CommissionOrder;
  referenceFile: SafeReferenceFile;
}
