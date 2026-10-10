import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AllowedOriginGuard } from '../shared/auth/allowed-origin.guard';
import { ParseUuidOr404Pipe } from '../shared/pipes/parse-uuid-or-404.pipe';
import { CatalogoFacade } from './catalogo.facade';

// Rota consumida pelo site (formulário de pedido): como toda rota do site, passa pelo AllowedOriginGuard.
// Compartilha o prefixo `makers` com o MakerController sem conflito (`:id` vs `:makerId/catalogo`).
@Controller('makers')
@UseGuards(AllowedOriginGuard)
export class CatalogoPublicoController {
  constructor(private readonly catalogoFacade: CatalogoFacade) {}

  @Get(':makerId/catalogo')
  async consultar(@Param('makerId', ParseUuidOr404Pipe) makerId: string) {
    return this.catalogoFacade.consultarCatalogoPublico(makerId);
  }
}
