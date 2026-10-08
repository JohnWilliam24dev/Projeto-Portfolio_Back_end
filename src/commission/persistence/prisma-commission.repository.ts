import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '../../shared/prisma/prisma-client';
import { IMAGE_STORAGE, ImageStorage, StoredImage } from '../../shared/storage/image-storage.port';
import { gerarTokenPedido } from '../../shared/token/token.util';
import {
  CommissionConsultaRepository,
  CommissionCriada,
  CommissionPublicaRegistro,
  CommissionRepository,
  CriarCommissionInput,
  TipoProdutoCatalogo,
} from './commission-repository.port';

const MAX_TENTATIVAS_TOKEN = 5;

// P2002 (unique) no token => sorteou um token que já existe: tenta outro. Outras unique
// (ex.: id+maker) NÃO são colisão de token e não devem ser repetidas. Olha o `meta` inteiro
// porque o formato do alvo varia conforme o driver (adapter-pg não preenche `target` igual ao
// engine antigo); o nome do índice/coluna sempre traz "token".
function isColisaoDeToken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    JSON.stringify(error.meta ?? {}).includes('token')
  );
}

@Injectable()
export class PrismaCommissionRepository implements CommissionRepository, CommissionConsultaRepository {
  private readonly logger = new Logger(PrismaCommissionRepository.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async buscarTipoProdutoComAdicionais(tipoProdutoId: string): Promise<TipoProdutoCatalogo | null> {
    const tipo = await this.prisma.tipoProduto.findUnique({
      where: { id: tipoProdutoId },
      include: { adicionais: { include: { adicional: true } } },
    });
    if (!tipo) return null;

    const adicionaisVinculados = new Map(
      tipo.adicionais.map(({ adicional }) => [
        adicional.id,
        {
          nome: adicional.nome,
          habilitado: adicional.habilitado,
          precoFixo: adicional.precoFixo,
          porcentagem: adicional.porcentagem,
        },
      ]),
    );

    return {
      id: tipo.id,
      makerId: tipo.makerId,
      nome: tipo.nome,
      precoBase: tipo.precoBase,
      habilitado: tipo.habilitado,
      adicionaisVinculados,
    };
  }

  async criar(input: CriarCommissionInput): Promise<CommissionCriada> {
    // 1) Imagem primeiro: se o upload falhar, nada é gravado. 2) Depois o banco, já com a URL;
    // qualquer falha definitiva apaga a imagem órfã.
    const imagem = await this.imageStorage.upload(input.referenceFile, 'commission');
    try {
      return await this.gravarComRetryDeToken(input, imagem);
    } catch (error) {
      await this.imageStorage.remove(imagem.publicId);
      throw error;
    }
  }

  async buscarPublicaPorToken(token: string): Promise<CommissionPublicaRegistro | null> {
    // `select` explícito: contato, e-mail, imagem e dados do Maker NUNCA saem daqui, mesmo que
    // alguém adicione colunas sensíveis ao model no futuro.
    const registro = await this.prisma.commission.findUnique({
      where: { token },
      select: {
        precoSimulado: true,
        orcamentoFinal: true,
        criadoEm: true,
        status: { select: { nome: true } },
        tipoProduto: { select: { nome: true } },
      },
    });
    if (!registro) return null;

    return {
      status: registro.status.nome,
      tipoProduto: registro.tipoProduto.nome,
      precoSimulado: registro.precoSimulado,
      orcamentoFinal: registro.orcamentoFinal,
      criadoEm: registro.criadoEm,
    };
  }

  private async gravarComRetryDeToken(input: CriarCommissionInput, imagem: StoredImage): Promise<CommissionCriada> {
    const statusId = await this.buscarStatusInicial(input.makerId);
    const posicao = await this.proximaPosicao(input.makerId, statusId);

    // Cada tentativa é UM `create` atômico (Commission + adicionais aninhados). Colidiu no token
    // (unique), sorteia outro: mais seguro que "checa se existe, depois insere" (janela de corrida).
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TOKEN; tentativa += 1) {
      try {
        return await this.prisma.commission.create({
          data: {
            makerId: input.makerId,
            tipoProdutoId: input.tipoProdutoId,
            statusId,
            token: gerarTokenPedido(),
            nomeCliente: input.nomeCliente,
            contato: input.contato,
            email: input.email,
            descricao: input.descricao,
            imagemRefUrl: imagem.url,
            imagemRefPublicId: imagem.publicId,
            precoSimulado: input.precoSimulado,
            posicao,
            adicionais: {
              // makerId NÃO entra aqui: a FK composta (commission_id, maker_id) o herda do pedido
              // pai, e o Prisma recusa o campo no create aninhado ("Unknown argument `makerId`").
              // A FK (adicional_id, maker_id) garante no banco que o adicional é do mesmo Maker.
              create: input.adicionais.map((adicional) => ({
                adicionalId: adicional.adicionalId,
                quantidade: adicional.quantidade,
                descricaoCliente: adicional.descricaoCliente,
                valorUnitario: adicional.valorUnitario,
              })),
            },
          },
          select: { id: true, token: true },
        });
      } catch (error) {
        if (isColisaoDeToken(error) && tentativa < MAX_TENTATIVAS_TOKEN) continue;
        this.logger.error('Falha ao gravar a commission', error instanceof Error ? error.stack : error);
        throw new IntegrationError('Não foi possível registrar o pedido agora.');
      }
    }
    // Inalcançável — só pro TS aceitar que a função sempre devolve ou lança.
    throw new IntegrationError('Não foi possível registrar o pedido agora.');
  }

  private async buscarStatusInicial(makerId: string): Promise<string> {
    const inicial = await this.prisma.status.findFirst({ where: { makerId, tipo: 'INICIAL' }, select: { id: true } });
    // Invariante: todo Maker tem exatamente 1 INICIAL. Se faltar, é cadastro corrompido — erro de
    // integração (e log), não "pedido inválido" do cliente.
    if (!inicial) {
      this.logger.error(`Maker ${makerId} sem status INICIAL — kanban corrompido.`);
      throw new IntegrationError('Não foi possível registrar o pedido agora.');
    }
    return inicial.id;
  }

  // posicao NÃO é única: sob concorrência dois pedidos podem receber o mesmo valor, e o desempate
  // por criado_em resolve na leitura (SGA 5.9). Por isso não precisa de lock aqui.
  private async proximaPosicao(makerId: string, statusId: string): Promise<number> {
    const { _max } = await this.prisma.commission.aggregate({ where: { makerId, statusId }, _max: { posicao: true } });
    return (_max.posicao ?? -1) + 1;
  }
}
