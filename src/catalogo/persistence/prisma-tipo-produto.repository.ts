import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '../../shared/errors/domain.errors';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { isPrismaError } from '../../shared/prisma/prisma-errors';
import {
  AtualizarTipoProdutoInput,
  CriarTipoProdutoInput,
  TipoProdutoRegistro,
  TipoProdutoRepository,
} from './tipo-produto-repository.port';

// `select` explícito: o registro devolvido tem só o que a API expõe.
const SELECT = {
  id: true,
  nome: true,
  precoBase: true,
  habilitado: true,
  criadoEm: true,
  adicionais: { select: { adicionalId: true } },
} as const;

type Linha = {
  id: string;
  nome: string;
  precoBase: TipoProdutoRegistro['precoBase'];
  habilitado: boolean;
  criadoEm: Date;
  adicionais: Array<{ adicionalId: string }>;
};

const paraRegistro = ({ adicionais, ...resto }: Linha): TipoProdutoRegistro => ({
  ...resto,
  adicionalIds: adicionais.map((a) => a.adicionalId),
});

// Toda consulta usa a chave composta (id, maker_id): o Maker faz parte da identidade do registro,
// então um id de outro Maker simplesmente "não existe" aqui.
const chave = (makerId: string, id: string) => ({ id_makerId: { id, makerId } });

@Injectable()
export class PrismaTipoProdutoRepository implements TipoProdutoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listar(makerId: string): Promise<TipoProdutoRegistro[]> {
    const linhas = await this.prisma.tipoProduto.findMany({ where: { makerId }, orderBy: { nome: 'asc' }, select: SELECT });
    return linhas.map(paraRegistro);
  }

  async buscarPorId(makerId: string, id: string): Promise<TipoProdutoRegistro | null> {
    const linha = await this.prisma.tipoProduto.findUnique({ where: chave(makerId, id), select: SELECT });
    return linha ? paraRegistro(linha) : null;
  }

  async criar(makerId: string, input: CriarTipoProdutoInput): Promise<TipoProdutoRegistro> {
    const linha = await this.prisma.tipoProduto.create({ data: { makerId, ...input }, select: SELECT });
    return paraRegistro(linha);
  }

  async atualizar(makerId: string, id: string, input: AtualizarTipoProdutoInput): Promise<TipoProdutoRegistro> {
    try {
      const linha = await this.prisma.tipoProduto.update({ where: chave(makerId, id), data: input, select: SELECT });
      return paraRegistro(linha);
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw new NotFoundError('Tipo de produto não encontrado.');
      throw error;
    }
  }

  async temDependencias(makerId: string, id: string): Promise<boolean> {
    const [pedido, portfolio] = await Promise.all([
      this.prisma.commission.findFirst({ where: { tipoProdutoId: id, makerId }, select: { id: true } }),
      this.prisma.produto.findFirst({ where: { tipoProdutoId: id, makerId }, select: { id: true } }),
    ]);
    return pedido !== null || portfolio !== null;
  }

  async excluir(makerId: string, id: string): Promise<void> {
    try {
      // Os vínculos (tipos_produto_adicionais) caem em cascata pelo próprio banco.
      await this.prisma.tipoProduto.delete({ where: chave(makerId, id) });
    } catch (error) {
      if (isPrismaError(error, 'P2025')) throw new NotFoundError('Tipo de produto não encontrado.');
      // Um pedido pode ter sido criado entre a checagem do service e este delete: a FK (RESTRICT) segura.
      if (isPrismaError(error, 'P2003')) throw new ConflictError('Este tipo de produto passou a ser usado em pedidos. Desabilite em vez de excluir.');
      throw error;
    }
  }

  async definirAdicionais(makerId: string, id: string, adicionalIds: string[]): Promise<void> {
    try {
      await this.prisma.$transaction([
        this.prisma.tipoProdutoAdicional.deleteMany({ where: { tipoProdutoId: id, makerId } }),
        this.prisma.tipoProdutoAdicional.createMany({
          data: adicionalIds.map((adicionalId) => ({ tipoProdutoId: id, adicionalId, makerId })),
        }),
      ]);
    } catch (error) {
      // FK composta (adicional_id, maker_id): adicional de outro Maker não entra nem por engano.
      if (isPrismaError(error, 'P2003')) throw new NotFoundError('Adicional não encontrado.');
      throw error;
    }
  }
}
