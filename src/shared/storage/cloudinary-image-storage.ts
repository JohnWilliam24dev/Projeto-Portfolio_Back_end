import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { IntegrationError } from '../errors/domain.errors';
import { SafeReferenceFile } from '../image/safe-reference-file';
import { parseCloudinaryUrl } from './cloudinary-url.util';
import { ImageStorage, StoredImage } from './image-storage.port';

@Injectable()
export class CloudinaryImageStorage implements ImageStorage {
  private readonly logger = new Logger(CloudinaryImageStorage.name);

  constructor(private readonly config: ConfigService) {}

  private configure(): void {
    const credentials = parseCloudinaryUrl(this.config.get<string>('CLOUDINARY_URL'));
    if (!credentials) throw new IntegrationError('Armazenamento de imagens indisponível.');
    cloudinary.config({ ...credentials, secure: true });
  }

  async upload(file: SafeReferenceFile, folder: string): Promise<StoredImage> {
    this.configure();
    try {
      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image', overwrite: false, timeout: 8_000 },
          (error, uploaded) => (error || !uploaded ? reject(error ?? new Error('upload vazio')) : resolve(uploaded)),
        );
        stream.end(file.buffer);
      });
      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      this.logger.error('Falha no upload da imagem ao Cloudinary', error instanceof Error ? error.stack : error);
      throw new IntegrationError('Não foi possível enviar a imagem agora.');
    }
  }

  async remove(publicId: string): Promise<void> {
    try {
      this.configure();
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      // Cleanup é best-effort: não pode mascarar o erro original que motivou a remoção.
      this.logger.warn(`Não foi possível remover a imagem órfã ${publicId} do Cloudinary.`);
    }
  }
}
