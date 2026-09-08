import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommissionService } from './commission.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { ReferenceImagePipe } from './validators/reference-image.pipe';
import { MAX_REFERENCE_FILE_SIZE } from '../config/commission.config';

// CORS, rate limit e método HTTP ficam a cargo de middlewares/guards globais (app.module.ts),
// não do controller — no Nest isso não precisa ser reimplementado à mão como no cors.js atual.
@Controller('commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('referenceFile', { limits: { fileSize: MAX_REFERENCE_FILE_SIZE } }))
  async submit(@Body() dto: CreateCommissionDto, @UploadedFile(ReferenceImagePipe) referenceFile: Express.Multer.File) {
    const { orderId } = await this.commissionService.submit(dto, referenceFile);
    return { success: true, orderId };
  }
}
