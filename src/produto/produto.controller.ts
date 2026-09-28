import { Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProdutoFacade } from './produto.facade';
import { CreateProdutoDto } from './dto/create-produto.dto';
import { ReferenceImagePipe } from '../shared/image/reference-image.pipe';
import { MAX_REFERENCE_FILE_SIZE } from '../config/reference-image.config';

// CORS, rate limit e método HTTP ficam a cargo de middlewares/guards globais (app.module.ts),
// não do controller — no Nest isso não precisa ser reimplementado à mão como no cors.js atual.
//
// Nota de convenção: o controller injeta ProdutoFacade, nunca ProdutoService.
// Isso vale mesmo estando os dois no mesmo módulo — a facade é o contrato, o resto é detalhe.
@Controller('produto')
export class ProdutoController {
  constructor(private readonly produtoFacade: ProdutoFacade) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('referenceFile', { limits: { fileSize: MAX_REFERENCE_FILE_SIZE } }))
  async submit(@Body() dto: CreateProdutoDto, @UploadedFile(ReferenceImagePipe) referenceFile: Express.Multer.File) {
    const { token } = await this.produtoFacade.submitProduto(dto, referenceFile);
    return { success: true, token };
  }
}
