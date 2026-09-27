import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../shared/auth/api-key.guard';
import { AuthenticatedRequest } from '../shared/auth/authenticated-request';
import { CreateMakerDto } from './dto/create-maker.dto';
import { UpdateMakerDto } from './dto/update-maker.dto';
import { MakerService } from './maker.service';

@Controller('makers')
export class MakerController {
  constructor(private readonly makerService: MakerService) {}

  @Post()
  async criar(@Body() dto: CreateMakerDto) {
    return this.makerService.criar(dto);
  }

  @Get(':id')
  async buscarPorId(@Param('id') id: string) {
    return this.makerService.buscarPorId(id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  async atualizar(@Param('id') id: string, @Req() request: AuthenticatedRequest, @Body() dto: UpdateMakerDto) {
    return this.makerService.atualizar(id, request.makerId, dto);
  }
}
