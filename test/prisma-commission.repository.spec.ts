import { Logger } from '@nestjs/common';
import { CriarCommissionInput } from '../src/commission/persistence/commission-repository.port';
import { PrismaCommissionRepository } from '../src/commission/persistence/prisma-commission.repository';
import { IntegrationError } from '../src/shared/errors/domain.errors';
import { PrismaService } from '../src/shared/prisma/prisma.service';
import { Prisma } from '../src/shared/prisma/prisma-client';
import { ImageStorage } from '../src/shared/storage/image-storage.port';

const D = (valor: string | number) => new Prisma.Decimal(valor);
const arquivo = { buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' };

const input: CriarCommissionInput = {
  makerId: 'maker-1',
  tipoProdutoId: 'tipo-1',
  nomeCliente: 'Cliente',
  contato: '@c',
  email: 'c@exemplo.com',
  descricao: 'd',
  precoSimulado: D(150),
  referenceFile: arquivo,
  adicionais: [{ adicionalId: 'ad-1', quantidade: 2, descricaoCliente: 'asas', valorUnitario: D(20) }],
};

const colisaoDeToken = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: { target: ['token'] } });
const outraUnique = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test', meta: { target: ['id', 'maker_id'] } });

function montar(opcoes: { create?: (args: any) => Promise<unknown>; statusInicial?: { id: string } | null; maxPosicao?: number | null } = {}) {
  const eventos: string[] = [];
  const chamadas: { create: any[]; status?: any; aggregate?: any } = { create: [] };
  const storage: ImageStorage = {
    upload: async () => { eventos.push('upload'); return { url: 'https://cdn/c.jpg', publicId: 'commission/c' }; },
    remove: async (id) => { eventos.push(`remove:${id}`); },
  };
  const prisma = {
    status: {
      findFirst: async (args: unknown) => { chamadas.status = args; return opcoes.statusInicial === undefined ? { id: 'status-inicial' } : opcoes.statusInicial; },
    },
    commission: {
      aggregate: async (args: unknown) => { chamadas.aggregate = args; return { _max: { posicao: opcoes.maxPosicao === undefined ? null : opcoes.maxPosicao } }; },
      create: async (args: any) => {
        eventos.push('banco');
        chamadas.create.push(args);
        return (opcoes.create ?? (async () => ({ id: 'c1', token: 'AB23C' })))(args);
      },
    },
  } as unknown as PrismaService;
  return { repo: new PrismaCommissionRepository(prisma, storage), eventos, chamadas, prisma };
}

describe('PrismaCommissionRepository.criar', () => {
  let loggerError: jest.SpyInstance;
  beforeEach(() => { loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined); });
  afterEach(() => loggerError.mockRestore());

  it('sobe a imagem ANTES do banco e grava só a URL e o publicId', async () => {
    const { repo, eventos, chamadas } = montar();

    const criada = await repo.criar(input);

    expect(criada).toEqual({ id: 'c1', token: 'AB23C' });
    expect(eventos).toEqual(['upload', 'banco']);
    expect(chamadas.create[0].data.imagemRefUrl).toBe('https://cdn/c.jpg');
    expect(chamadas.create[0].data.imagemRefPublicId).toBe('commission/c');
  });

  it('entra no status INICIAL do próprio Maker', async () => {
    const { repo, chamadas } = montar({ statusInicial: { id: 'status-do-maker' } });

    await repo.criar(input);

    expect(chamadas.status.where).toEqual({ makerId: 'maker-1', tipo: 'INICIAL' });
    expect(chamadas.create[0].data.statusId).toBe('status-do-maker');
  });

  it.each([
    [null, 0],
    [0, 1],
    [7, 8],
  ])('posição no fim da coluna: maior posicao atual %p => nova %p', async (maxAtual, esperada) => {
    const { repo, chamadas } = montar({ maxPosicao: maxAtual });

    await repo.criar(input);

    expect(chamadas.aggregate.where).toEqual({ makerId: 'maker-1', statusId: 'status-inicial' });
    expect(chamadas.create[0].data.posicao).toBe(esperada);
  });

  it('grava commission e adicionais em UM create aninhado (atômico), com snapshot do valor', async () => {
    const { repo, chamadas } = montar();

    await repo.criar(input);

    expect(chamadas.create).toHaveLength(1);
    const { data } = chamadas.create[0];
    expect(data.makerId).toBe('maker-1');
    expect(data.email).toBe('c@exemplo.com');
    expect(data.precoSimulado.toFixed(2)).toBe('150.00');
    expect(data.adicionais.create).toHaveLength(1);
    expect(data.adicionais.create[0]).toMatchObject({ adicionalId: 'ad-1', quantidade: 2, descricaoCliente: 'asas' });
    expect(data.adicionais.create[0]).not.toHaveProperty('makerId'); // herdado do pai pela FK composta
    expect(data.adicionais.create[0].valorUnitario.toFixed(2)).toBe('20.00');
  });

  it('apaga a imagem órfã e lança IntegrationError se o banco falhar', async () => {
    const { repo, eventos } = montar({ create: async () => { throw new Error('db down'); } });

    await expect(repo.criar(input)).rejects.toBeInstanceOf(IntegrationError);
    expect(eventos).toEqual(['upload', 'banco', 'remove:commission/c']);
  });

  it('colisão de token (P2002 no token): sorteia outro e tenta de novo, sem reenviar a imagem', async () => {
    let tentativas = 0;
    const { repo, eventos, chamadas } = montar({
      create: async () => {
        tentativas += 1;
        if (tentativas === 1) throw colisaoDeToken();
        return { id: 'c1', token: 'XY45Z' };
      },
    });

    const criada = await repo.criar(input);

    expect(criada.token).toBe('XY45Z');
    expect(chamadas.create).toHaveLength(2);
    expect(eventos.filter((e) => e === 'upload')).toHaveLength(1);
    expect(eventos.some((e) => e.startsWith('remove'))).toBe(false);
  });

  it('colisão persistente: desiste após 5 tentativas e apaga a imagem', async () => {
    const { repo, eventos, chamadas } = montar({ create: async () => { throw colisaoDeToken(); } });

    await expect(repo.criar(input)).rejects.toBeInstanceOf(IntegrationError);
    expect(chamadas.create).toHaveLength(5);
    expect(eventos[eventos.length - 1]).toBe('remove:commission/c');
  });

  it('P2002 em OUTRA unique (não é o token) não é repetida: falha de primeira', async () => {
    const { repo, chamadas } = montar({ create: async () => { throw outraUnique(); } });

    await expect(repo.criar(input)).rejects.toBeInstanceOf(IntegrationError);
    expect(chamadas.create).toHaveLength(1);
  });

  it('Maker sem status INICIAL (kanban corrompido): IntegrationError, nada gravado e imagem apagada', async () => {
    const { repo, eventos, chamadas } = montar({ statusInicial: null });

    await expect(repo.criar(input)).rejects.toBeInstanceOf(IntegrationError);
    expect(chamadas.create).toHaveLength(0);
    expect(eventos).toEqual(['upload', 'remove:commission/c']);
  });
});

describe('PrismaCommissionRepository.buscarPublicaPorToken', () => {
  function montarConsulta(resultado: unknown) {
    const capturado: { args?: any } = {};
    const prisma = { commission: { findUnique: async (args: unknown) => { capturado.args = args; return resultado; } } } as unknown as PrismaService;
    return { repo: new PrismaCommissionRepository(prisma, {} as ImageStorage), capturado };
  }

  it('seleciona SOMENTE campos públicos: nunca contato, e-mail, imagem de referência nem dados do Maker', async () => {
    const { repo, capturado } = montarConsulta(null);

    await repo.buscarPublicaPorToken('AB23C');

    const select = JSON.stringify(capturado.args.select);
    for (const proibido of ['contato', 'email', 'imagem', 'nomeCliente', 'descricao', 'maker', 'token']) {
      expect(select.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
    expect(capturado.args.where).toEqual({ token: 'AB23C' });
  });

  it('devolve null para token inexistente e mapeia os nomes do status e do tipo', async () => {
    expect((await montarConsulta(null).repo.buscarPublicaPorToken('AB23C'))).toBeNull();

    const { repo } = montarConsulta({
      precoSimulado: D(150),
      orcamentoFinal: null,
      criadoEm: new Date('2026-10-07T12:00:00Z'),
      status: { nome: 'Fila' },
      tipoProduto: { nome: 'Chibi' },
    });
    expect(await repo.buscarPublicaPorToken('AB23C')).toMatchObject({ status: 'Fila', tipoProduto: 'Chibi', orcamentoFinal: null });
  });
});
