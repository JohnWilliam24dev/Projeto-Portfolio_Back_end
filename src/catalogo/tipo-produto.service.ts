import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, ValidationError } from '../shared/errors/domain.errors';
import { Prisma } from '../shared/prisma/prisma-client';
import { TipoProdutoResposta } from './catalogo.types';
import { DefinirAdicionaisDto, CreateTipoProdutoDto, UpdateTipoProdutoDto } from './dto/tipo-produto.dto';
import { ADICIONAL_REPOSITORY, AdicionalRepository } from './persistence/adicional-repository.port';
import { TIPO_PRODUTO_REPOSITORY, TipoProdutoRegistro, TipoProdutoRepository } from './persistence/tipo-produto-repository.port';

const paraResposta = (t: TipoProdutoRegistro): TipoProdutoResposta => ({
  id: t.id,
  nome: t.nome,
  precoBase: t.precoBase.toFixed(2),
  habilitado: t.habilitado,
  criadoEm: t.criadoEm.toISOString(),
  adicionalIds: t.adicionalIds,
});

// Tipos de produto do Maker autenticado (mesma regra do AdicionalService: makerId em toda chamada).
@Injectable()
export class TipoProdutoService {
  constructor(
    @Inject(TIPO_PRODUTO_REPOSITORY) private readonly repository: TipoProdutoRepository,
    @Inject(ADICIONAL_REPOSITORY) private readonly adicionalRepository: AdicionalRepository,
  ) {}

  async listar(makerId: string): Promise<TipoProdutoResposta[]> {
    return (await this.repository.listar(makerId)).map(paraResposta);
  }

  async criar(makerId: string, dto: CreateTipoProdutoDto): Promise<TipoProdutoResposta> {
    const criado = await this.repository.criar(makerId, {
      nome: dto.nome,
      precoBase: new Prisma.Decimal(dto.precoBase),
      habilitado: dto.habilitado ?? true,
    });
    return paraResposta(criado);
  }

  async atualizar(makerId: string, id: string, dto: UpdateTipoProdutoDto): Promise<TipoProdutoResposta> {
    if (Object.values(dto).every((valor) => valor === undefined)) {
      throw new ValidationError('Envie ao menos um campo para atualizar.');
    }
    if (!(await this.repository.buscarPorId(makerId, id))) throw new NotFoundError('Tipo de produto não encontrado.');

    const atualizado = await this.repository.atualizar(makerId, id, {
      nome: dto.nome,
      precoBase: dto.precoBase === undefined ? undefined : new Prisma.Decimal(dto.precoBase),
      habilitado: dto.habilitado,
    });
    return paraResposta(atualizado);
  }

  async excluir(makerId: string, id: string): Promise<void> {
    if (!(await this.repository.buscarPorId(makerId, id))) throw new NotFoundError('Tipo de produto não encontrado.');
    if (await this.repository.temDependencias(makerId, id)) {
      throw new ConflictError('Este tipo de produto já foi usado em pedidos ou no portfólio e não pode ser excluído. Desabilite-o.');
    }
    await this.repository.excluir(makerId, id);
  }

  async definirAdicionais(makerId: string, id: string, dto: DefinirAdicionaisDto): Promise<TipoProdutoResposta> {
    if (!(await this.repository.buscarPorId(makerId, id))) throw new NotFoundError('Tipo de produto não encontrado.');

    // Repetidos no pedido viram um só; "existe mas é de outro Maker" cai no mesmo 404 de "não existe".
    const ids = [...new Set(dto.adicionalIds)];
    if (ids.length > 0 && (await this.adicionalRepository.contarPorIds(makerId, ids)) !== ids.length) {
      throw new NotFoundError('Adicional não encontrado.');
    }

    await this.repository.definirAdicionais(makerId, id, ids);
    const atualizado = await this.repository.buscarPorId(makerId, id);
    if (!atualizado) throw new NotFoundError('Tipo de produto não encontrado.');
    return paraResposta(atualizado);
  }
}
