import { Module } from '@nestjs/common';
import { CloudinaryImageStorage } from './cloudinary-image-storage';
import { IMAGE_STORAGE } from './image-storage.port';

@Module({
  providers: [{ provide: IMAGE_STORAGE, useClass: CloudinaryImageStorage }],
  exports: [IMAGE_STORAGE],
})
export class StorageModule {}
