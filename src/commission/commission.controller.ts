import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_REFERENCE_FILE_SIZE } from '../config/reference-image.config';
import { AllowedOriginGuard } from '../shared/auth/allowed-origin.guard';
import { ReferenceImagePipe } from '../shared/image/reference-image.pipe';
import { CommissionFacade } from './commission.facade';
import { CreateCommissionDto } from './dto/create-commission.dto';

// Rotas consumidas pelo site: toda rota nova do site já nasce com o AllowedOriginGuard (SGA, seção
// URGENTE). O guard roda antes do FileInterceptor, então requisição barrada nem faz o multer ler o upload.
// O controller injeta a facade, nunca os services — a facade é o contrato, o resto é detalhe.
@Controller('commissions')
@UseGuards(AllowedOriginGuard)
export class CommissionController {
  constructor(private readonly commissionFacade: CommissionFacade) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('referenceFile', { limits: { fileSize: MAX_REFERENCE_FILE_SIZE } }))
  async submit(@Body() dto: CreateCommissionDto, @UploadedFile(ReferenceImagePipe) referenceFile: Express.Multer.File) {
    const { token } = await this.commissionFacade.submitCommission(dto, referenceFile);
    return { success: true, token };
  }

  @Get('token/:token')
  async consultar(@Param('token') token: string) {
    return this.commissionFacade.consultarPorToken(token);
  }
}
