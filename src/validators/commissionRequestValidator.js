import { MODEL_LABELS, REFERENCE_IMAGE_TYPES } from '../config/commission.js';
import { ValidationError } from '../shared/errors/HttpError.js';

function normalizeText(value, maxLength) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function parseQuantity(value, label) {
  if (!/^\d{1,2}$/.test(String(value ?? ''))) throw new ValidationError(`${label} inválida.`);
  const quantity = Number(value);
  if (quantity > 20) throw new ValidationError(`${label} inválida.`);
  return quantity;
}

function hasExpectedImageSignature(buffer, mimeType) {
  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  const signature = REFERENCE_IMAGE_TYPES.get(mimeType)?.signature;
  return Boolean(signature && buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(Buffer.from(signature)));
}

export function validateCommissionRequest({ fields, referenceFile }) {
  if (normalizeText(fields.website, 100)) throw new ValidationError('Pedido inválido.');
  const order = {
    nickname: normalizeText(fields.nickname, 80), contact: normalizeText(fields.contact, 160),
    modelType: normalizeText(fields.modelType, 30), additionalContentNotes: normalizeText(fields.additionalContentNotes, 1_000),
    acessorios: parseQuantity(fields.acessorios, 'Quantidade de acessórios'),
    expressoesExtras: parseQuantity(fields.expressoesExtras, 'Quantidade de expressões'),
  };
  if (!order.nickname || !order.contact || !Object.hasOwn(MODEL_LABELS, order.modelType)) {
    throw new ValidationError('Dados obrigatórios do pedido estão inválidos.');
  }
  if (!referenceFile || referenceFile.tooLarge || !REFERENCE_IMAGE_TYPES.has(referenceFile.mimeType) || !hasExpectedImageSignature(referenceFile.buffer, referenceFile.mimeType)) {
    throw new ValidationError('A referência deve ser uma imagem PNG, JPEG ou WebP de até 5 MB.');
  }
  return order;
}
