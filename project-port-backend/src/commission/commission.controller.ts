import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommissionFacade } from './commission.facade';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { ReferenceImagePipe } from './validators/reference-image.pipe';
import { MAX_REFERENCE_FILE_SIZE } from '../config/commission.config';

// CORS, rate limit e método HTTP ficam a cargo de middlewares/guards globais (app.module.ts),
// não do controller — no Nest isso não precisa ser reimplementado à mão como no cors.js atual.
//
// Nota de convenção: o controller injeta CommissionFacade, nunca CommissionService.
// Isso vale mesmo estando os dois no mesmo módulo — a facade é o contrato, o resto é detalhe.
@Controller('commission')
export class CommissionController {
  constructor(private readonly commissionFacade: CommissionFacade) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('referenceFile', { limits: { fileSize: MAX_REFERENCE_FILE_SIZE } }))
  async submit(@Body() dto: CreateCommissionDto, @UploadedFile(ReferenceImagePipe) referenceFile: Express.Multer.File) {
    const { orderId } = await this.commissionFacade.submitCommission(dto, referenceFile);
    return { success: true, orderId };
  }
}
