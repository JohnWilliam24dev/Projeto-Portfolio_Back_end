import { AdicionalService } from '../src/catalogo/adicional.service';
import { AdicionalRegistro, AdicionalRepository } from '../src/catalogo/persistence/adicional-repository.port';
import { ConflictError, NotFoundError, ValidationError } from '../src/shared/errors/domain.errors';
import { Prisma } from '../src/shared/prisma/prisma-client';

const MAKER = 'maker-1';
const registro = (overrides: Partial<AdicionalRegistro> = {}): AdicionalRegistro => ({
  id: 'ad-1',
  nome: 'Asas',
  descricao: null,
  precoFixo: new Prisma.Decimal(20),
  porcentagem: null,
  habilitado: true,
  criadoEm: new Date('2026-10-07T12:00:00Z'),
  ...overrides,
});

function montar(opcoes: { existente?: AdicionalRegistro | null; emUso?: boolean } = {}) {
  const repo = {
    listar: jest.fn(async () => [registro()]),
    buscarPorId: jest.fn(async () => (opcoes.existente === undefined ? registro() : opcoes.existente)),
    criar: jest.fn(async (_m: string, input: Partial<AdicionalRegistro>) => registro({ ...input })),
    atualizar: jest.fn(async () => registro()),
    temUso: jest.fn(async () => opcoes.emUso ?? false),
    excluir: jest.fn(async () => undefined),
    contarPorIds: jest.fn(async () => 0),
  } as unknown as jest.Mocked<AdicionalRepository>;
  return { service: new AdicionalService(repo), repo };
}

describe('AdicionalService', () => {
  describe('criar', () => {
    it('com preço fixo: grava fixo e porcentagem null, habilitado por padrão', async () => {
      const { service, repo } = montar();

      const resposta = await service.criar(MAKER, { nome: 'Asas', precoFixo: 20 });

      const gravado = repo.criar.mock.calls[0][1];
      expect(gravado.precoFixo?.toFixed(2)).toBe('20.00');
      expect(gravado.porcentagem).toBeNull();
      expect(gravado.habilitado).toBe(true);
      expect(resposta).toMatchObject({ precoFixo: '20.00', porcentagem: null });
    });

    it('com porcentagem: grava porcentagem e fixo null', async () => {
      const { service, repo } = montar();
      await service.criar(MAKER, { nome: 'Cenário', porcentagem: 10 });
      const gravado = repo.criar.mock.calls[0][1];
      expect(gravado.porcentagem?.toFixed(2)).toBe('10.00');
      expect(gravado.precoFixo).toBeNull();
    });

    it.each([
      ['sem nenhuma regra de preço', { nome: 'x' }],
      ['com as duas regras', { nome: 'x', precoFixo: 1, porcentagem: 1 }],
    ])('%s: 400 e nada é gravado', async (_nome, dto) => {
      const { service, repo } = montar();
      await expect(service.criar(MAKER, dto)).rejects.toBeInstanceOf(ValidationError);
      expect(repo.criar).not.toHaveBeenCalled();
    });

    it('descrição vazia é gravada como null', async () => {
      const { service, repo } = montar();
      await service.criar(MAKER, { nome: 'x', precoFixo: 1, descricao: '' });
      expect(repo.criar.mock.calls[0][1].descricao).toBeNull();
    });
  });

  describe('atualizar', () => {
    it('trocar fixo -> porcentagem zera o fixo (senão o CHECK do banco recusaria)', async () => {
      const { service, repo } = montar();

      await service.atualizar(MAKER, 'ad-1', { porcentagem: 15 });

      const patch = repo.atualizar.mock.calls[0][2];
      expect(patch.porcentagem?.toFixed(2)).toBe('15.00');
      expect(patch.precoFixo).toBeNull();
    });

    it('sem mexer no preço, não envia nenhuma das duas colunas de preço', async () => {
      const { service, repo } = montar();

      await service.atualizar(MAKER, 'ad-1', { habilitado: false });

      const patch = repo.atualizar.mock.calls[0][2];
      expect(patch).not.toHaveProperty('precoFixo');
      expect(patch).not.toHaveProperty('porcentagem');
      expect(patch.habilitado).toBe(false);
    });

    it('descrição "" apaga (null) e ausente mantém (undefined)', async () => {
      const { service, repo } = montar();
      await service.atualizar(MAKER, 'ad-1', { descricao: '' });
      await service.atualizar(MAKER, 'ad-1', { nome: 'Novo' });
      expect(repo.atualizar.mock.calls[0][2].descricao).toBeNull();
      expect(repo.atualizar.mock.calls[1][2].descricao).toBeUndefined();
    });

    it('as duas regras de preço juntas: 400; nenhum campo: 400', async () => {
      const { service } = montar();
      await expect(service.atualizar(MAKER, 'ad-1', { precoFixo: 1, porcentagem: 1 })).rejects.toBeInstanceOf(ValidationError);
      await expect(service.atualizar(MAKER, 'ad-1', {})).rejects.toBeInstanceOf(ValidationError);
    });

    it('adicional inexistente ou de outro Maker: 404, nada alterado, e o makerId foi usado na busca', async () => {
      const { service, repo } = montar({ existente: null });
      await expect(service.atualizar(MAKER, 'x', { nome: 'a' })).rejects.toBeInstanceOf(NotFoundError);
      expect(repo.buscarPorId).toHaveBeenCalledWith(MAKER, 'x');
      expect(repo.atualizar).not.toHaveBeenCalled();
    });
  });

  describe('excluir', () => {
    it('exclui adicional nunca usado em pedido', async () => {
      const { service, repo } = montar({ emUso: false });
      await service.excluir(MAKER, 'ad-1');
      expect(repo.excluir).toHaveBeenCalledWith(MAKER, 'ad-1');
    });

    it('adicional já usado em pedido: 409 mandando desabilitar, e NÃO exclui', async () => {
      const { service, repo } = montar({ emUso: true });
      const erro = await service.excluir(MAKER, 'ad-1').catch((e) => e);
      expect(erro).toBeInstanceOf(ConflictError);
      expect(erro.message).toContain('Desabilite');
      expect(repo.excluir).not.toHaveBeenCalled();
    });

    it('inexistente ou de outro Maker: 404', async () => {
      const { service } = montar({ existente: null });
      await expect(service.excluir(MAKER, 'x')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
