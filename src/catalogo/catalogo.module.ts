import { Module } from '@nestjs/common';
import { PrismaModule } from '../shared/prisma/prisma.module';
import { AdicionalController } from './adicional.controller';
import { AdicionalService } from './adicional.service';
import { CatalogoConsultaService } from './catalogo-consulta.service';
import { CatalogoPublicoController } from './catalogo-publico.controller';
import { CatalogoFacade } from './catalogo.facade';
import { ADICIONAL_REPOSITORY } from './persistence/adicional-repository.port';
import { CATALOGO_PUBLICO_REPOSITORY } from './persistence/catalogo-publico-repository.port';
import { PrismaAdicionalRepository } from './persistence/prisma-adicional.repository';
import { PrismaCatalogoPublicoRepository } from './persistence/prisma-catalogo-publico.repository';
import { PrismaTipoProdutoRepository } from './persistence/prisma-tipo-produto.repository';
import { TIPO_PRODUTO_REPOSITORY } from './persistence/tipo-produto-repository.port';
import { TipoProdutoController } from './tipo-produto.controller';
import { TipoProdutoService } from './tipo-produto.service';

// `exports: [CatalogoFacade]`: os services e repositórios não saem do módulo. Trocar o ORM = trocar
// os `useClass` abaixo, sem tocar em controller nem service.
@Module({
  imports: [PrismaModule],
  controllers: [CatalogoPublicoController, TipoProdutoController, AdicionalController],
  providers: [
    CatalogoFacade,
    TipoProdutoService,
    AdicionalService,
    CatalogoConsultaService,
    { provide: TIPO_PRODUTO_REPOSITORY, useClass: PrismaTipoProdutoRepository },
    { provide: ADICIONAL_REPOSITORY, useClass: PrismaAdicionalRepository },
    { provide: CATALOGO_PUBLICO_REPOSITORY, useClass: PrismaCatalogoPublicoRepository },
  ],
  exports: [CatalogoFacade],
})
export class CatalogoModule {}
