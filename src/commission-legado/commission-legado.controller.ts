import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommissionLegadoFacade } from './commission-legado.facade';
import { CreateCommissionLegadoDto } from './dto/create-commission-legado.dto';
import { AllowedOriginGuard } from '../shared/auth/allowed-origin.guard';
import { ReferenceImagePipe } from '../shared/image/reference-image.pipe';
import { MAX_REFERENCE_FILE_SIZE } from '../config/reference-image.config';

// CORS é configurado em main.ts, mas só instrui o navegador: quem recusa no servidor é o
// AllowedOriginGuard (403 sem Origin ou fora de ALLOWED_ORIGINS). Rate limit ainda NÃO existe
// (planejado na seção 12 do plano SGA); não há guard/interceptor global fazendo isso.
//
// Nota de convenção: o controller injeta CommissionLegadoFacade, nunca CommissionLegadoService.
// Isso vale mesmo estando os dois no mesmo módulo — a facade é o contrato, o resto é detalhe.
@Controller('commission')
@UseGuards(AllowedOriginGuard)
export class CommissionLegadoController {
  constructor(private readonly commissionFacade: CommissionLegadoFacade) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('referenceFile', { limits: { fileSize: MAX_REFERENCE_FILE_SIZE } }))
  async submit(@Body() dto: CreateCommissionLegadoDto, @UploadedFile(ReferenceImagePipe) referenceFile: Express.Multer.File) {
    const { orderId } = await this.commissionFacade.submitCommission(dto, referenceFile);
    return { success: true, orderId };
  }
}
