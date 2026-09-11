import { Injectable, PipeTransform } from '@nestjs/common';
import { MAX_REFERENCE_FILE_SIZE, REFERENCE_IMAGE_TYPES } from '../../config/commission.config';
import { ValidationError } from '../../shared/errors/domain.errors';

// Mesma lógica de hasExpectedImageSignature() do validator atual: nunca confia no mimetype
// que o navegador manda, sempre confere os magic bytes do buffer recebido.
function hasExpectedImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/webp') {
    return buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  const signature = REFERENCE_IMAGE_TYPES.get(mimeType)?.signature;
  return Boolean(signature && buffer.length >= signature.length && buffer.subarray(0, signature.length).equals(Buffer.from(signature)));
}

@Injectable()
export class ReferenceImagePipe implements PipeTransform<Express.Multer.File, Express.Multer.File> {
  transform(file: Express.Multer.File): Express.Multer.File {
    const tooLarge = !file || file.size > MAX_REFERENCE_FILE_SIZE;
    const knownType = file && REFERENCE_IMAGE_TYPES.has(file.mimetype);
    const validSignature = file && knownType && hasExpectedImageSignature(file.buffer, file.mimetype);

    if (tooLarge || !knownType || !validSignature) {
      throw new ValidationError('A referência deve ser uma imagem PNG, JPEG ou WebP de até 5 MB.');
    }
    return file;
  }
}
