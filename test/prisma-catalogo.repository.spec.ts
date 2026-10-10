import { PrismaAdicionalRepository } from '../src/catalogo/persistence/prisma-adicional.repository';
import { PrismaCatalogoPublicoRepository } from '../src/catalogo/persistence/prisma-catalogo-publico.repository';
import { PrismaTipoProdutoRepository } from '../src/catalogo/persistence/prisma-tipo-produto.repository';
import { ConflictError, NotFoundError } from '../src/shared/errors/domain.errors';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { Prisma } from '../src/shared/prisma/prisma-client';

const MAKER = 'maker-do-token';
const erroPrisma = (code: string) => new Prisma.PrismaClientKnownRequestError('x', { code, clientVersion: 'test' });

// Fake que registra os argumentos de TODA chamada, pra provar que o makerId nunca fica de fora.
function espiao(respostas: Record<string, unknown> = {}) {
  const chamadas: Array<{ metodo: string; args: any }> = [];
  const delegate = (modelo: string) =>
    new Proxy({}, {
      get: (_t, metodo: string) => async (args: unknown) => {
        chamadas.push({ metodo: `${modelo}.${metodo}`, args });
        const resposta = respostas[`${modelo}.${metodo}`];
        if (resposta instanceof Error) throw resposta;
        return resposta ?? (metodo === 'findMany' ? [] : null);
      },
    });
  const prisma = {
    tipoProduto: delegate('tipoProduto'),
    tipoProdutoAdicional: delegate('tipoProdutoAdicional'),
    adicional: delegate('adicional'),
    commission: delegate('commission'),
    commissionAdicional: delegate('commissionAdicional'),
    produto: delegate('produto'),
    maker: delegate('maker'),
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return { prisma, chamadas };
}

const contemMaker = (args: any) => JSON.stringify(args?.where ?? {}).includes(MAKER);

describe('Repositórios do catálogo: toda consulta é filtrada por makerId', () => {
  it('PrismaTipoProdutoRepository: nenhuma operação sai sem o makerId no where', async () => {
    const { prisma, chamadas } = espiao({ 'tipoProduto.findUnique': null });
    const repo = new PrismaTipoProdutoRepository(prisma);

    await repo.listar(MAKER);
    await repo.buscarPorId(MAKER, 'id');
    await repo.temDependencias(MAKER, 'id');
    await repo.definirAdicionais(MAKER, 'id', ['a']).catch(() => undefined);

    const leituras = chamadas.filter((c) => /find|delete|count/.test(c.metodo));
    expect(leituras.length).toBeGreaterThanOrEqual(5);
    for (const { metodo, args } of leituras) expect({ metodo, filtraPorMaker: contemMaker(args) }).toEqual({ metodo, filtraPorMaker: true });
  });

  it('PrismaTipoProdutoRepository: update/delete usam a chave composta (id, makerId)', async () => {
    const { prisma, chamadas } = espiao({ 'tipoProduto.update': { id: 'id', nome: 'n', precoBase: new Prisma.Decimal(1), habilitado: true, criadoEm: new Date(), adicionais: [] } });
    const repo = new PrismaTipoProdutoRepository(prisma);

    await repo.atualizar(MAKER, 'id', { nome: 'n' });
    await repo.excluir(MAKER, 'id');

    for (const c of chamadas) expect(c.args.where).toEqual({ id_makerId: { id: 'id', makerId: MAKER } });
  });

  it('PrismaAdicionalRepository: nenhuma operação sai sem o makerId', async () => {
    const { prisma, chamadas } = espiao({ 'adicional.count': 0 });
    const repo = new PrismaAdicionalRepository(prisma);

    await repo.listar(MAKER);
    await repo.buscarPorId(MAKER, 'id');
    await repo.temUso(MAKER, 'id');
    await repo.contarPorIds(MAKER, ['a', 'b']);

    expect(chamadas).toHaveLength(4);
    for (const { metodo, args } of chamadas) expect({ metodo, filtraPorMaker: contemMaker(args) }).toEqual({ metodo, filtraPorMaker: true });
  });

  it('P2025 (registro sumiu) vira 404 e P2003 (FK) vira 409/404 conforme a operação', async () => {
    const tipos = (codigo: string) => new PrismaTipoProdutoRepository(espiao({ 'tipoProduto.update': erroPrisma(codigo), 'tipoProduto.delete': erroPrisma(codigo), 'tipoProdutoAdicional.createMany': erroPrisma(codigo) }).prisma);
    const adicionais = (codigo: string) => new PrismaAdicionalRepository(espiao({ 'adicional.update': erroPrisma(codigo), 'adicional.delete': erroPrisma(codigo) }).prisma);

    await expect(tipos('P2025').atualizar(MAKER, 'i', { nome: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(tipos('P2025').excluir(MAKER, 'i')).rejects.toBeInstanceOf(NotFoundError);
    await expect(tipos('P2003').excluir(MAKER, 'i')).rejects.toBeInstanceOf(ConflictError);
    await expect(tipos('P2003').definirAdicionais(MAKER, 'i', ['a'])).rejects.toBeInstanceOf(NotFoundError);
    await expect(adicionais('P2025').atualizar(MAKER, 'i', { nome: 'x' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(adicionais('P2003').excluir(MAKER, 'i')).rejects.toBeInstanceOf(ConflictError);
  });

  it('erro inesperado do banco NÃO é mascarado como 404/409', async () => {
    const repo = new PrismaTipoProdutoRepository(espiao({ 'tipoProduto.delete': new Error('conexão caiu') }).prisma);
    await expect(repo.excluir(MAKER, 'i')).rejects.toThrow('conexão caiu');
  });

  it('catálogo público: consulta só o Maker pedido e seleciona somente tipos/adicionais habilitados', async () => {
    const { prisma, chamadas } = espiao({ 'maker.findUnique': { tiposProduto: [] } });
    await new PrismaCatalogoPublicoRepository(prisma).buscarPorMaker(MAKER);

    const { args } = chamadas[0];
    expect(args.where).toEqual({ id: MAKER });
    expect(args.select.tiposProduto.where).toEqual({ habilitado: true });
    expect(args.select.tiposProduto.select.adicionais.where).toEqual({ adicional: { habilitado: true } });
    expect(JSON.stringify(args.select).toLowerCase()).not.toContain('makerid');
  });

  it('catálogo público: Maker inexistente devolve null', async () => {
    const { prisma } = espiao({ 'maker.findUnique': null });
    expect(await new PrismaCatalogoPublicoRepository(prisma).buscarPorMaker(MAKER)).toBeNull();
  });
});
