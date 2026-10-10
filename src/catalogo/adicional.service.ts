import { Inject, Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError, ValidationError } from '../shared/errors/domain.errors';
import { regraParaAtualizacao, regraParaCriacao } from './adicional-preco.util';
import { AdicionalResposta } from './catalogo.types';
import { CreateAdicionalDto, UpdateAdicionalDto } from './dto/adicional.dto';
import { ADICIONAL_REPOSITORY, AdicionalRegistro, AdicionalRepository } from './persistence/adicional-repository.port';

const paraResposta = (a: AdicionalRegistro): AdicionalResposta => ({
  id: a.id,
  nome: a.nome,
  descricao: a.descricao,
  precoFixo: a.precoFixo ? a.precoFixo.toFixed(2) : null,
  porcentagem: a.porcentagem ? a.porcentagem.toFixed(2) : null,
  habilitado: a.habilitado,
  criadoEm: a.criadoEm.toISOString(),
});

// Adicionais do Maker autenticado. `makerId` chega de fora (ApiKeyGuard) e é repassado a TODA
// chamada ao repositório: o service nunca monta uma consulta sem ele.
@Injectable()
export class AdicionalService {
  constructor(@Inject(ADICIONAL_REPOSITORY) private readonly repository: AdicionalRepository) {}

  async listar(makerId: string): Promise<AdicionalResposta[]> {
    return (await this.repository.listar(makerId)).map(paraResposta);
  }

  async criar(makerId: string, dto: CreateAdicionalDto): Promise<AdicionalResposta> {
    const regra = regraParaCriacao(dto);
    const criado = await this.repository.criar(makerId, {
      nome: dto.nome,
      descricao: dto.descricao ? dto.descricao : null,
      precoFixo: regra.precoFixo,
      porcentagem: regra.porcentagem,
      habilitado: dto.habilitado ?? true,
    });
    return paraResposta(criado);
  }

  async atualizar(makerId: string, id: string, dto: UpdateAdicionalDto): Promise<AdicionalResposta> {
    const nadaParaAtualizar = Object.values(dto).every((valor) => valor === undefined);
    if (nadaParaAtualizar) throw new ValidationError('Envie ao menos um campo para atualizar.');
    const regra = regraParaAtualizacao(dto);

    if (!(await this.repository.buscarPorId(makerId, id))) throw new NotFoundError('Adicional não encontrado.');

    const atualizado = await this.repository.atualizar(makerId, id, {
      nome: dto.nome,
      // '' apaga a descrição (vira NULL); undefined mantém.
      descricao: dto.descricao === undefined ? undefined : dto.descricao || null,
      habilitado: dto.habilitado,
      ...regra,
    });
    return paraResposta(atualizado);
  }

  async excluir(makerId: string, id: string): Promise<void> {
    if (!(await this.repository.buscarPorId(makerId, id))) throw new NotFoundError('Adicional não encontrado.');
    // Pedido antigo guarda o valor como snapshot, mas continua apontando pro adicional: excluir
    // quebraria o histórico. Quem já foi usado só pode ser desabilitado.
    if (await this.repository.temUso(makerId, id)) {
      throw new ConflictError('Este adicional já foi usado em pedidos e não pode ser excluído. Desabilite-o.');
    }
    await this.repository.excluir(makerId, id);
  }
}
