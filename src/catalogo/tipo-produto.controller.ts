import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../shared/auth/api-key.guard';
import { MakerAutenticado } from '../shared/auth/maker-autenticado.decorator';
import { ParseUuidOr404Pipe } from '../shared/pipes/parse-uuid-or-404.pipe';
import { CatalogoFacade } from './catalogo.facade';
import { CreateTipoProdutoDto, DefinirAdicionaisDto, UpdateTipoProdutoDto } from './dto/tipo-produto.dto';

// Painel do Maker: o dono vem SEMPRE da API key (@MakerAutenticado), nunca de body/path/query.
@Controller('tipos-produto')
@UseGuards(ApiKeyGuard)
export class TipoProdutoController {
  constructor(private readonly catalogoFacade: CatalogoFacade) {}

  @Get()
  async listar(@MakerAutenticado() makerId: string) {
    return this.catalogoFacade.listarTiposProduto(makerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@MakerAutenticado() makerId: string, @Body() dto: CreateTipoProdutoDto) {
    return this.catalogoFacade.criarTipoProduto(makerId, dto);
  }

  @Patch(':id')
  async atualizar(@MakerAutenticado() makerId: string, @Param('id', ParseUuidOr404Pipe) id: string, @Body() dto: UpdateTipoProdutoDto) {
    return this.catalogoFacade.atualizarTipoProduto(makerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@MakerAutenticado() makerId: string, @Param('id', ParseUuidOr404Pipe) id: string) {
    await this.catalogoFacade.excluirTipoProduto(makerId, id);
  }

  @Put(':id/adicionais')
  async definirAdicionais(@MakerAutenticado() makerId: string, @Param('id', ParseUuidOr404Pipe) id: string, @Body() dto: DefinirAdicionaisDto) {
    return this.catalogoFacade.definirAdicionaisDoTipo(makerId, id, dto);
  }
}
