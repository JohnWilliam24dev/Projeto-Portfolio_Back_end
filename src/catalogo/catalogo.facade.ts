import { Injectable } from '@nestjs/common';
import { AdicionalService } from './adicional.service';
import { CatalogoConsultaService } from './catalogo-consulta.service';
import { AdicionalResposta, CatalogoPublicoResposta, TipoProdutoResposta } from './catalogo.types';
import { CreateAdicionalDto, UpdateAdicionalDto } from './dto/adicional.dto';
import { CreateTipoProdutoDto, DefinirAdicionaisDto, UpdateTipoProdutoDto } from './dto/tipo-produto.dto';
import { TipoProdutoService } from './tipo-produto.service';

/**
 * Única porta pública do módulo (convenção do projeto): controllers e outros módulos nunca injetam
 * os services. Toda operação do painel recebe o `makerId` do Maker autenticado como PRIMEIRO
 * argumento, de modo que não existe chamada "sem dono".
 */
@Injectable()
export class CatalogoFacade {
  constructor(
    private readonly tipoProdutoService: TipoProdutoService,
    private readonly adicionalService: AdicionalService,
    private readonly consultaService: CatalogoConsultaService,
  ) {}

  consultarCatalogoPublico(makerId: string): Promise<CatalogoPublicoResposta> {
    return this.consultaService.consultar(makerId);
  }

  listarTiposProduto(makerId: string): Promise<TipoProdutoResposta[]> {
    return this.tipoProdutoService.listar(makerId);
  }
  criarTipoProduto(makerId: string, dto: CreateTipoProdutoDto): Promise<TipoProdutoResposta> {
    return this.tipoProdutoService.criar(makerId, dto);
  }
  atualizarTipoProduto(makerId: string, id: string, dto: UpdateTipoProdutoDto): Promise<TipoProdutoResposta> {
    return this.tipoProdutoService.atualizar(makerId, id, dto);
  }
  excluirTipoProduto(makerId: string, id: string): Promise<void> {
    return this.tipoProdutoService.excluir(makerId, id);
  }
  definirAdicionaisDoTipo(makerId: string, id: string, dto: DefinirAdicionaisDto): Promise<TipoProdutoResposta> {
    return this.tipoProdutoService.definirAdicionais(makerId, id, dto);
  }

  listarAdicionais(makerId: string): Promise<AdicionalResposta[]> {
    return this.adicionalService.listar(makerId);
  }
  criarAdicional(makerId: string, dto: CreateAdicionalDto): Promise<AdicionalResposta> {
    return this.adicionalService.criar(makerId, dto);
  }
  atualizarAdicional(makerId: string, id: string, dto: UpdateAdicionalDto): Promise<AdicionalResposta> {
    return this.adicionalService.atualizar(makerId, id, dto);
  }
  excluirAdicional(makerId: string, id: string): Promise<void> {
    return this.adicionalService.excluir(makerId, id);
  }
}
