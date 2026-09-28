import { Prisma } from '../../shared/prisma/prisma-client';

// Porta hexagonal, mesmo padrão do NotificationGateway: o service depende só disso,
// nunca do PrismaService diretamente. Troca de ORM/banco no futuro é só trocar o
// `useClass` no produto.module.ts.
export const PRODUTO_REPOSITORY = Symbol('PRODUTO_REPOSITORY');

export interface RegraPrecoAdicional {
  nome: string;
  porcentagem: Prisma.Decimal | null;
  valorFixo: Prisma.Decimal | null;
}

export interface TipoProdutoCatalogo {
  id: string;
  makerId: string;
  nome: string;
  precoMedio: Prisma.Decimal;
  // chave = TipoAdicional.id — só os adicionais realmente vinculados a este TipoProduto
  // (via TipoProdutoAdicional) entram aqui; qualquer id fora deste mapa é inválido.
  adicionaisPermitidos: Map<string, RegraPrecoAdicional>;
}

export interface CriarProdutoInput {
  tipoProdutoId: string;
  nomeCliente: string;
  contato: string;
  descricao: string;
  precoSimulado: Prisma.Decimal;
  adicionais: Array<{ tipoAdicionalId: string; descricao: string }>;
}

export interface CriarPedidoInput {
  makerId: string;
  produtos: CriarProdutoInput[];
}

export interface PedidoCriado {
  id: string;
  token: string;
  status: string;
}

export interface ProdutoRepository {
  /** Retorna null se o tipoProdutoId não existir — quem chama decide como isso vira erro. */
  buscarTipoProdutoComAdicionais(tipoProdutoId: string): Promise<TipoProdutoCatalogo | null>;

  /** Grava Pedido + Produto(s) + AdicionalProduto(s) atomicamente e devolve o token gerado. */
  criarPedido(input: CriarPedidoInput): Promise<PedidoCriado>;
}
