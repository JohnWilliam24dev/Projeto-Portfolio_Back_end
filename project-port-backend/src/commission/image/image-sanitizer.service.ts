import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { MAX_IMAGE_PIXELS } from '../../config/commission.config';
import { ValidationError } from '../../shared/errors/domain.errors';
import { SafeReferenceFile } from '../commission.types';

// Mesmo papel do referenceImageSanitizer.js: reencoda pra JPEG via sharp, o que descarta
// metadados/EXIF e qualquer payload malicioso escondido no arquivo original do cliente.
@Injectable()
export class ImageSanitizerService {
  async sanitize(referenceFile: Express.Multer.File): Promise<SafeReferenceFile> {
    try {
      const buffer = await sharp(referenceFile.buffer, { failOn: 'error', limitInputPixels: MAX_IMAGE_PIXELS })
        .rotate()
        .jpeg({ quality: 90, mozjpeg: true })
        .toBuffer();
      return { buffer, mimeType: 'image/jpeg', extension: 'jpg' };
    } catch {
      throw new ValidationError('Não foi possível processar a imagem de referência.');
    }
  }
}
