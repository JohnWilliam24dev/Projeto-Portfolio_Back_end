import sharp from 'sharp';
import { MAX_IMAGE_PIXELS } from '../config/commission.js';
import { ValidationError } from '../shared/errors/HttpError.js';

export function createReferenceImageSanitizer({ imageProcessor = sharp } = {}) {
  return {
    async sanitize(referenceFile) {
      try {
        const buffer = await imageProcessor(referenceFile.buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS })
          .rotate().jpeg({ quality: 90, mozjpeg: true }).toBuffer();
        return { buffer, mimeType: 'image/jpeg', extension: 'jpg' };
      } catch {
        throw new ValidationError('Não foi possível processar a imagem de referência.');
      }
    },
  };
}
