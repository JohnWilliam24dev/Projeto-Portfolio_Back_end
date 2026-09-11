export interface CommissionOrder {
  nickname: string;
  contact: string;
  modelType: string;
  additionalContentNotes: string;
  acessorios: number;
  expressoesExtras: number;
}

export interface SafeReferenceFile {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export interface NotifyPayload {
  orderId: string;
  order: CommissionOrder;
  referenceFile: SafeReferenceFile;
}
