import { Prisma } from '../shared/prisma/prisma-client';
import { AdicionalComPreco } from './pricing.util';

export interface SafeReferenceFile {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

// Payload de notificação: carrega um "retrato" já resolvido do pedido (nomes de
// catálogo, valores calculados) — o gateway não faz nenhuma consulta própria,
// só formata e envia o que o service já apurou.
export interface NotifyPayload {
  token: string;
  tipoProdutoNome: string;
  nomeCliente: string;
  contato: string;
  descricao: string;
  adicionais: AdicionalComPreco[];
  precoSimulado: Prisma.Decimal;
  referenceFile: SafeReferenceFile;
}
