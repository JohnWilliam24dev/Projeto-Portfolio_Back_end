import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import {
  AtualizarMakerInput,
  CriarMakerInput,
  MakerPublico,
  MakerRepository,
} from './maker-repository.port';

// `select` explícito em toda query — nunca um `apiKeySecretHash` escapa daqui por acidente
// (ex.: alguém adicionar um campo sensível novo no futuro e esquecer de excluir do retorno).
const SELECT_PUBLICO = {
  id: true,
  nome: true,
  termosCondicoes: true,
  facoENaoFaco: true,
} as const;

@Injectable()
export class PrismaMakerRepository implements MakerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarMakerInput): Promise<MakerPublico> {
    return this.prisma.maker.create({
      data: {
        nome: input.nome,
        termosCondicoes: input.termosCondicoes,
        facoENaoFaco: input.facoENaoFaco,
        apiKeySecretHash: input.apiKeySecretHash,
        apiKeyGeradaEm: new Date(),
        // Create aninhado = uma única escrita atômica (Maker + 4 status): falhou no meio, nada fica
        // gravado, então nunca existe Maker sem kanban e dispensa $transaction explícito.
        statuses: { create: input.statusIniciais.map(({ nome, ordem, tipo }) => ({ nome, ordem, tipo })) },
      },
      select: SELECT_PUBLICO,
    });
  }

  async buscarPorId(id: string): Promise<MakerPublico | null> {
    return this.prisma.maker.findUnique({ where: { id }, select: SELECT_PUBLICO });
  }

  async atualizar(id: string, input: AtualizarMakerInput): Promise<MakerPublico> {
    return this.prisma.maker.update({
      where: { id },
      data: {
        nome: input.nome,
        termosCondicoes: input.termosCondicoes,
        facoENaoFaco: input.facoENaoFaco,
      },
      select: SELECT_PUBLICO,
    });
  }
}
