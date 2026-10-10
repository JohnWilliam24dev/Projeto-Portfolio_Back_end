import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../shared/auth/api-key.guard';
import { MakerAutenticado } from '../shared/auth/maker-autenticado.decorator';
import { ParseUuidOr404Pipe } from '../shared/pipes/parse-uuid-or-404.pipe';
import { CatalogoFacade } from './catalogo.facade';
import { CreateAdicionalDto, UpdateAdicionalDto } from './dto/adicional.dto';

@Controller('adicionais')
@UseGuards(ApiKeyGuard)
export class AdicionalController {
  constructor(private readonly catalogoFacade: CatalogoFacade) {}

  @Get()
  async listar(@MakerAutenticado() makerId: string) {
    return this.catalogoFacade.listarAdicionais(makerId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async criar(@MakerAutenticado() makerId: string, @Body() dto: CreateAdicionalDto) {
    return this.catalogoFacade.criarAdicional(makerId, dto);
  }

  @Patch(':id')
  async atualizar(@MakerAutenticado() makerId: string, @Param('id', ParseUuidOr404Pipe) id: string, @Body() dto: UpdateAdicionalDto) {
    return this.catalogoFacade.atualizarAdicional(makerId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async excluir(@MakerAutenticado() makerId: string, @Param('id', ParseUuidOr404Pipe) id: string) {
    await this.catalogoFacade.excluirAdicional(makerId, id);
  }
}
