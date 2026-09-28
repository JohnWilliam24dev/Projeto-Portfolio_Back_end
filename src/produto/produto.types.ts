import { SafeReferenceFile } from '../shared/image/safe-reference-file';
import { Prisma } from '../shared/prisma/prisma-client';
import { AdicionalComPreco } from './pricing.util';

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
