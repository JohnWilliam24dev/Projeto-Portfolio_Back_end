import { TipoProdutoService } from '../src/catalogo/tipo-produto.service';
import { AdicionalRepository } from '../src/catalogo/persistence/adicional-repository.port';
import { TipoProdutoRegistro, TipoProdutoRepository } from '../src/catalogo/persistence/tipo-produto-repository.port';
import { ConflictError, NotFoundError, ValidationError } from '../src/shared/errors/domain.errors';
import { Prisma } from '../src/shared/prisma/prisma-client';

const MAKER = 'maker-1';
const registro = (overrides: Partial<TipoProdutoRegistro> = {}): TipoProdutoRegistro => ({
  id: 'tipo-1',
  nome: 'Chibi',
  precoBase: new Prisma.Decimal(100),
  habilitado: true,
  criadoEm: new Date('2026-10-07T12:00:00Z'),
  adicionalIds: [],
  ...overrides,
});

function montar(opcoes: { existente?: TipoProdutoRegistro | null; dependencias?: boolean; adicionaisValidos?: number } = {}) {
  const repo = {
    listar: jest.fn(async () => [registro()]),
    buscarPorId: jest.fn(async () => (opcoes.existente === undefined ? registro() : opcoes.existente)),
    criar: jest.fn(async (_m: string, input: { nome: string; precoBase: Prisma.Decimal; habilitado: boolean }) => registro({ nome: input.nome, precoBase: input.precoBase, habilitado: input.habilitado })),
    atualizar: jest.fn(async (_m: string, _id: string, input: { nome?: string }) => registro({ ...(input.nome ? { nome: input.nome } : {}) })),
    temDependencias: jest.fn(async () => opcoes.dependencias ?? false),
    excluir: jest.fn(async () => undefined),
    definirAdicionais: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<TipoProdutoRepository>;
  const adicionais = {
    contarPorIds: jest.fn(async (_m: string, ids: string[]) => (opcoes.adicionaisValidos === undefined ? ids.length : opcoes.adicionaisValidos)),
  };
  return { service: new TipoProdutoService(repo, adicionais as unknown as AdicionalRepository), repo, adicionais };
}

describe('TipoProdutoService', () => {
  it('criar: habilitado é true por padrão e o preço vira Decimal', async () => {
    const { service, repo } = montar();

    const resposta = await service.criar(MAKER, { nome: 'Chibi', precoBase: 100.5 });

    expect(repo.criar).toHaveBeenCalledWith(MAKER, { nome: 'Chibi', precoBase: new Prisma.Decimal('100.5'), habilitado: true });
    expect(resposta).toMatchObject({ nome: 'Chibi', precoBase: '100.50', habilitado: true });
  });

  it('responde preço como string de 2 casas e data ISO', async () => {
    const { service } = montar();
    expect((await service.listar(MAKER))[0]).toMatchObject({ precoBase: '100.00', criadoEm: '2026-10-07T12:00:00.000Z' });
  });

  describe('isolamento: o makerId vai em TODA chamada ao repositório', () => {
    it('listar, atualizar, excluir e definirAdicionais repassam o makerId do autenticado', async () => {
      const { service, repo } = montar();

      await service.listar(MAKER);
      await service.atualizar(MAKER, 'tipo-1', { nome: 'Novo' });
      await service.definirAdicionais(MAKER, 'tipo-1', { adicionalIds: [] });
      await service.excluir(MAKER, 'tipo-1');

      for (const mock of [repo.listar, repo.buscarPorId, repo.atualizar, repo.temDependencias, repo.excluir, repo.definirAdicionais]) {
        for (const chamada of mock.mock.calls) expect(chamada[0]).toBe(MAKER);
      }
    });

    it.each([
      ['atualizar', (s: TipoProdutoService) => s.atualizar(MAKER, 'x', { nome: 'a' })],
      ['excluir', (s: TipoProdutoService) => s.excluir(MAKER, 'x')],
      ['definirAdicionais', (s: TipoProdutoService) => s.definirAdicionais(MAKER, 'x', { adicionalIds: [] })],
    ])('%s em tipo inexistente OU de outro Maker responde 404 e não altera nada', async (_nome, operacao) => {
      const { service, repo } = montar({ existente: null });

      await expect(operacao(service)).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.atualizar).not.toHaveBeenCalled();
      expect(repo.excluir).not.toHaveBeenCalled();
      expect(repo.definirAdicionais).not.toHaveBeenCalled();
    });
  });

  it('atualizar sem nenhum campo é 400', async () => {
    const { service } = montar();
    await expect(service.atualizar(MAKER, 'tipo-1', {})).rejects.toBeInstanceOf(ValidationError);
  });

  describe('excluir', () => {
    it('exclui quando não há pedido nem portfólio usando', async () => {
      const { service, repo } = montar({ dependencias: false });
      await service.excluir(MAKER, 'tipo-1');
      expect(repo.excluir).toHaveBeenCalledWith(MAKER, 'tipo-1');
    });

    it('com dependências responde 409 mandando desabilitar, e NÃO exclui', async () => {
      const { service, repo } = montar({ dependencias: true });

      const erro = await service.excluir(MAKER, 'tipo-1').catch((e) => e);

      expect(erro).toBeInstanceOf(ConflictError);
      expect(erro.message).toContain('Desabilite');
      expect(repo.excluir).not.toHaveBeenCalled();
    });
  });

  describe('definirAdicionais', () => {
    it('grava o conjunto e devolve o tipo', async () => {
      const { service, repo } = montar();
      await service.definirAdicionais(MAKER, 'tipo-1', { adicionalIds: ['a', 'b'] });
      expect(repo.definirAdicionais).toHaveBeenCalledWith(MAKER, 'tipo-1', ['a', 'b']);
    });

    it('ids repetidos viram um só (e são conferidos como únicos)', async () => {
      const { service, repo, adicionais } = montar();
      await service.definirAdicionais(MAKER, 'tipo-1', { adicionalIds: ['a', 'a', 'b', 'a'] });
      expect(adicionais.contarPorIds).toHaveBeenCalledWith(MAKER, ['a', 'b']);
      expect(repo.definirAdicionais).toHaveBeenCalledWith(MAKER, 'tipo-1', ['a', 'b']);
    });

    it('adicional inexistente ou de outro Maker (contagem menor que o pedido) é 404 e não grava', async () => {
      const { service, repo } = montar({ adicionaisValidos: 1 });

      await expect(service.definirAdicionais(MAKER, 'tipo-1', { adicionalIds: ['a', 'de-outro-maker'] })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.definirAdicionais).not.toHaveBeenCalled();
    });

    it('lista vazia desvincula tudo sem consultar adicionais', async () => {
      const { service, repo, adicionais } = montar();
      await service.definirAdicionais(MAKER, 'tipo-1', { adicionalIds: [] });
      expect(adicionais.contarPorIds).not.toHaveBeenCalled();
      expect(repo.definirAdicionais).toHaveBeenCalledWith(MAKER, 'tipo-1', []);
    });
  });
});
