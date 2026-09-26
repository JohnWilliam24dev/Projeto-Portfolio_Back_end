import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '../../shared/prisma/prisma-client';
import { IntegrationError } from '../../shared/errors/domain.errors';
import {
  CommissionRepository,
  CriarPedidoInput,
  PedidoCriado,
  TipoProdutoCatalogo,
} from './commission-repository.port';
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
export class PrismaCommissionRepository implements CommissionRepository {
  constructor(private readonly prisma: PrismaService) {}

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
              create: input.produtos.map((produto) => ({
                makerId: input.makerId,
                tipoProdutoId: produto.tipoProdutoId,
                nomeCliente: produto.nomeCliente,
                contato: produto.contato,
                descricao: produto.descricao,
                precoSimulado: produto.precoSimulado,
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
    // Inalcançável (o loop sempre retorna ou lança antes disso) — só aqui pro TS aceitar
    // que a função sempre devolve ou lança.
    throw new IntegrationError('Não foi possível registrar o pedido agora.');
  }
}
