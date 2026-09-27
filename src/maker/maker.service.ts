import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError, ValidationError } from '../shared/errors/domain.errors';
import { gerarSegredoApiKey, hashSegredoApiKey, montarApiKey } from '../shared/auth/api-key.util';
import { CreateMakerDto } from './dto/create-maker.dto';
import { UpdateMakerDto } from './dto/update-maker.dto';
import { MAKER_REPOSITORY, MakerPublico, MakerRepository } from './persistence/maker-repository.port';

export interface MakerCriado extends MakerPublico {
  /** Só existe nesta resposta, uma única vez — não é persistido em texto plano em lugar nenhum. */
  apiKey: string;
}

@Injectable()
export class MakerService {
  constructor(@Inject(MAKER_REPOSITORY) private readonly makerRepository: MakerRepository) {}

  async criar(dto: CreateMakerDto): Promise<MakerCriado> {
    const segredo = gerarSegredoApiKey();
    const maker = await this.makerRepository.criar({
      nome: dto.nome,
      termosCondicoes: dto.termosCondicoes,
      facoENaoFaco: dto.facoENaoFaco,
      apiKeySecretHash: hashSegredoApiKey(segredo),
    });

    // A API key só existe montada (makerId + segredo) aqui, na resposta desta chamada.
    // Se o Maker perder essa chave, a solução é rotacionar (endpoint futuro), não recuperar.
    return { ...maker, apiKey: montarApiKey(maker.id, segredo) };
  }

  async buscarPorId(id: string): Promise<MakerPublico> {
    const maker = await this.makerRepository.buscarPorId(id);
    if (!maker) throw new NotFoundError('Maker não encontrado.');
    return maker;
  }

  async atualizar(id: string, makerAutenticadoId: string, dto: UpdateMakerDto): Promise<MakerPublico> {
    if (id !== makerAutenticadoId) {
      throw new ForbiddenError('Você só pode editar o seu próprio cadastro.');
    }
    if (dto.nome === undefined && dto.termosCondicoes === undefined && dto.facoENaoFaco === undefined) {
      throw new ValidationError('Envie ao menos um campo para atualizar.');
    }

    const makerExiste = await this.makerRepository.buscarPorId(id);
    if (!makerExiste) throw new NotFoundError('Maker não encontrado.');

    return this.makerRepository.atualizar(id, dto);
  }
}
