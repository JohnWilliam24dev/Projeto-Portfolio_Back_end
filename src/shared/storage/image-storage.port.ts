import { SafeReferenceFile } from '../image/safe-reference-file';

// Porta de armazenamento de imagem (mesmo padrão hexagonal do NotificationGateway):
// os repositórios dependem só disso, nunca do Cloudinary. Trocar por S3/R2 = novo adapter.
export const IMAGE_STORAGE = Symbol('IMAGE_STORAGE');

export interface StoredImage {
  /** URL pública da imagem — é o que vai pro banco. */
  url: string;
  /** Identificador no provedor — necessário pra apagar a imagem (cleanup de órfãs). */
  publicId: string;
}

export interface ImageStorage {
  upload(file: SafeReferenceFile, folder: string): Promise<StoredImage>;
  /** Best-effort: nunca lança; falha de cleanup só vira log. */
  remove(publicId: string): Promise<void>;
}
