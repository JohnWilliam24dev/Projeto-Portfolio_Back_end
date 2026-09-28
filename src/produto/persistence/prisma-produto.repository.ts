import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '../../shared/prisma/prisma-client';
import { IntegrationError } from '../../shared/errors/domain.errors';
import { IMAGE_STORAGE, ImageStorage, StoredImage } from '../../shared/storage/image-storage.port';
import {
  ProdutoRepository,
  CriarPedidoInput,
  PedidoCriado,
  TipoProdutoCatalogo,
} from './produto-repository.port';
import { gerarTokenPedido } from './token.util';

const MAX_TENTATIVAS_TOKEN = 5;

function alvoIncluiToken(target: unknown): boolean {
  if (Array.isArray(target)) return target.includes('token');
  return typeof target === 'string' && target.includes('token');
}

function isColisaoDeToken(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    alvoIncluiToken(error.meta?.target)
  );
}

@Injectable()
export class PrismaProdutoRepository implements ProdutoRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IMAGE_STORAGE) private readonly imageStorage: ImageStorage,
  ) {}

  async buscarTipoProdutoComAdicionais(tipoProdutoId: string): Promise<TipoProdutoCatalogo | null> {
    const tipoProduto = await this.prisma.tipoProduto.findUnique({
      where: { id: tipoProdutoId },
      include: { tiposAdicional: { include: { tipoAdicional: true } } },
    });
    if (!tipoProduto) return null;

    const adicionaisPermitidos = new Map(
      tipoProduto.tiposAdicional.map(({ tipoAdicional }) => [
        tipoAdicional.id,
        { nome: tipoAdicional.nome, porcentagem: tipoAdicional.porcentagem, valorFixo: tipoAdicional.valorFixo },
      ]),
    );

    return {
      id: tipoProduto.id,
      makerId: tipoProduto.makerId,
      nome: tipoProduto.nome,
      precoMedio: tipoProduto.precoMedio,
      adicionaisPermitidos,
    };
  }

  async criarPedido(input: CriarPedidoInput): Promise<PedidoCriado> {
    // 1) Imagens primeiro, UMA vez (fora do loop de retry do token): se algum upload falhar,
    // nada é gravado e as que já subiram são apagadas.
    const imagens = await this.subirImagens(input);

    // 2) Depois o banco, já com as URLs. Qualquer falha definitiva apaga as imagens órfãs.
    try {
      return await this.gravarComRetryDeToken(input, imagens);
    } catch (error) {
      await Promise.all(imagens.map((imagem) => this.imageStorage.remove(imagem.publicId)));
      throw error;
    }
  }

  private async subirImagens(input: CriarPedidoInput): Promise<StoredImage[]> {
    const resultados = await Promise.allSettled(
      input.produtos.map((produto) => this.imageStorage.upload(produto.referenceFile, 'produto')),
    );
    const subidas = resultados.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    const falhou = resultados.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (falhou) {
      await Promise.all(subidas.map((imagem) => this.imageStorage.remove(imagem.publicId)));
      throw falhou.reason;
    }
    return subidas;
  }

  private async gravarComRetryDeToken(input: CriarPedidoInput, imagens: StoredImage[]): Promise<PedidoCriado> {
    // Cada tentativa é um único `create` atômico (Pedido + Produtos + Adicionais aninhados
    // numa query só). Se colidir no token (unique constraint), tenta de novo com um token
    // novo — é mais seguro que "checar se existe, depois inserir" (janela de corrida).
    for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_TOKEN; tentativa += 1) {
      const token = gerarTokenPedido();
      try {
        return await this.prisma.pedido.create({
          data: {
            makerId: input.makerId,
            token,
            produtos: {
              create: input.produtos.map((produto, indice) => ({
                makerId: input.makerId,
                tipoProdutoId: produto.tipoProdutoId,
                nomeCliente: produto.nomeCliente,
                contato: produto.contato,
                descricao: produto.descricao,
                precoSimulado: produto.precoSimulado,
                imagemUrl: imagens[indice].url,
                imagemPublicId: imagens[indice].publicId,
                adicionaisProduto: {
                  create: produto.adicionais.map((adicional) => ({
                    tipoAdicionalId: adicional.tipoAdicionalId,
                    descricao: adicional.descricao,
                  })),
                },
              })),
            },
          },
          select: { id: true, token: true, status: true },
        });
      } catch (error) {
        if (isColisaoDeToken(error) && tentativa < MAX_TENTATIVAS_TOKEN) continue;
        throw new IntegrationError('Não foi possível registrar o pedido agora.');
      }
    }
    // Inalcançável — só pro TS aceitar que a função sempre devolve ou lança.
    throw new IntegrationError('Não foi possível registrar o pedido agora.');
  }
}
