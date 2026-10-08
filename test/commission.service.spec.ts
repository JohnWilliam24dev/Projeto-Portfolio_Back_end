import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CommissionService } from '../src/commission/commission.service';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import { COMMISSION_REPOSITORY, TipoProdutoCatalogo } from '../src/commission/persistence/commission-repository.port';
import { ValidationError } from '../src/shared/errors/domain.errors';
import { ImageSanitizerService } from '../src/shared/image/image-sanitizer.service';
import { Prisma } from '../src/shared/prisma/prisma-client';

const D = (valor: string | number) => new Prisma.Decimal(valor);

function catalogo(overrides: Partial<TipoProdutoCatalogo> = {}): TipoProdutoCatalogo {
  return {
    id: 'tipo-1',
    makerId: 'maker-1',
    nome: 'Modelo Chibi 3D',
    precoBase: D(100),
    habilitado: true,
    adicionaisVinculados: new Map([
      ['ad-fixo', { nome: 'Asas', habilitado: true, precoFixo: D(20), porcentagem: null }],
      ['ad-pct', { nome: 'Cenário', habilitado: true, precoFixo: null, porcentagem: D(10) }],
      ['ad-off', { nome: 'Antigo', habilitado: false, precoFixo: D(5), porcentagem: null }],
    ]),
    ...overrides,
  };
}

function dto(overrides: Partial<CreateCommissionDto> = {}): CreateCommissionDto {
  return {
    tipoProdutoId: 'tipo-1',
    nomeCliente: 'Cliente',
    contato: '@cliente',
    descricao: 'Quero um chibi com cabelo azul',
    adicionais: [
      { adicionalId: 'ad-fixo', quantidade: 2, descricaoCliente: 'Asas de dragão azuis' },
      { adicionalId: 'ad-pct', quantidade: 1, descricaoCliente: 'Floresta' },
    ],
    ...overrides,
  } as CreateCommissionDto;
}

const sanitizerStub = { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) };

async function montar(opcoes: { tipo?: TipoProdutoCatalogo | null; notify?: () => Promise<void>; token?: string } = {}) {
  const eventos: string[] = [];
  const recebido: { criar?: any; notify?: any } = {};
  const buscar = jest.fn(async () => (opcoes.tipo === undefined ? catalogo() : opcoes.tipo));

  const moduleRef = await Test.createTestingModule({
    providers: [
      CommissionService,
      { provide: ImageSanitizerService, useValue: sanitizerStub },
      {
        provide: COMMISSION_REPOSITORY,
        useValue: {
          buscarTipoProdutoComAdicionais: buscar,
          criar: jest.fn(async (input: unknown) => {
            eventos.push('banco');
            recebido.criar = input;
            return { id: 'commission-uuid-interno', token: opcoes.token ?? 'AB23C' };
          }),
        },
      },
      {
        provide: NOTIFICATION_GATEWAY,
        useValue: {
          notify: jest.fn(async (payload: unknown) => {
            eventos.push('telegram');
            recebido.notify = payload;
            if (opcoes.notify) await opcoes.notify();
          }),
        },
      },
    ],
  }).compile();

  return {
    service: moduleRef.get(CommissionService),
    repository: moduleRef.get<any>(COMMISSION_REPOSITORY),
    gateway: moduleRef.get<any>(NOTIFICATION_GATEWAY),
    buscar,
    eventos,
    recebido,
  };
}

describe('CommissionService', () => {
  it('grava no banco antes de notificar e responde com o token (não o id interno)', async () => {
    const { service, eventos, recebido } = await montar();

    const result = await service.submit(dto(), {} as Express.Multer.File);

    expect(result).toEqual({ token: 'AB23C' });
    expect(eventos).toEqual(['banco', 'telegram']);
    expect(recebido.notify.token).toBe('AB23C');
  });

  it('calcula o preço no servidor: base 100 + 2x fixo 20 + 1x (10% de 100) = 150', async () => {
    const { service, recebido } = await montar();

    await service.submit(dto(), {} as Express.Multer.File);

    expect(recebido.criar.precoSimulado.toFixed(2)).toBe('150.00');
    expect(recebido.notify.precoSimulado.toFixed(2)).toBe('150.00');
  });

  it('grava o snapshot do valor unitário e a soma dos snapshots bate com o preço simulado', async () => {
    const { service, recebido } = await montar();

    await service.submit(dto(), {} as Express.Multer.File);

    const gravados = recebido.criar.adicionais as Array<{ valorUnitario: Prisma.Decimal; quantidade: number }>;
    expect(gravados.map((a) => a.valorUnitario.toFixed(2))).toEqual(['20.00', '10.00']);
    const soma = gravados.reduce((t, a) => t.plus(a.valorUnitario.mul(a.quantidade)), D(100));
    expect(soma.equals(recebido.criar.precoSimulado)).toBe(true);
  });

  it('deriva o makerId do tipo de produto, nunca de dado do cliente', async () => {
    const { service, recebido } = await montar({ tipo: catalogo({ makerId: 'maker-do-catalogo' }) });

    await service.submit({ ...dto(), makerId: 'maker-de-outro' } as CreateCommissionDto, {} as Express.Multer.File);

    expect(recebido.criar.makerId).toBe('maker-do-catalogo');
  });

  it('repassa e-mail e quantidade ao banco e ao Telegram', async () => {
    const { service, recebido } = await montar();

    await service.submit(dto({ email: 'cliente@exemplo.com' }), {} as Express.Multer.File);

    expect(recebido.criar.email).toBe('cliente@exemplo.com');
    expect(recebido.notify.email).toBe('cliente@exemplo.com');
    expect(recebido.notify.adicionais[0]).toMatchObject({ nome: 'Asas', quantidade: 2 });
  });

  it('não derruba o pedido se o Telegram falhar: o banco é a fonte da verdade e a falha é logada com o token', async () => {
    const loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { service } = await montar({ token: 'ZZ99Z', notify: async () => { throw new Error('Telegram fora do ar'); } });

    const result = await service.submit(dto(), {} as Express.Multer.File);

    expect(result).toEqual({ token: 'ZZ99Z' });
    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError.mock.calls[0][0]).toContain('ZZ99Z');
    loggerError.mockRestore();
  });

  describe('rejeições (sem tocar no banco nem no Telegram)', () => {

    it.each([
      ['tipo de produto inexistente', { tipo: null }, dto()],
      ['tipo de produto desabilitado', { tipo: catalogo({ habilitado: false }) }, dto()],
      ['adicional que não está vinculado ao tipo', {}, dto({ adicionais: [{ adicionalId: 'ad-de-outro-tipo', quantidade: 1, descricaoCliente: 'x' }] })],
      ['adicional desabilitado', {}, dto({ adicionais: [{ adicionalId: 'ad-off', quantidade: 1, descricaoCliente: 'x' }] })],
      [
        'adicional repetido na lista (a repetição é expressa por quantidade)',
        {},
        dto({
          adicionais: [
            { adicionalId: 'ad-fixo', quantidade: 1, descricaoCliente: 'a' },
            { adicionalId: 'ad-fixo', quantidade: 1, descricaoCliente: 'b' },
          ],
        }),
      ],
    ])('rejeita %s', async (_nome, opcoes, pedido) => {
      const { service, repository, gateway } = await montar(opcoes as { tipo?: TipoProdutoCatalogo | null });

      await expect(service.submit(pedido, {} as Express.Multer.File)).rejects.toBeInstanceOf(ValidationError);
      expect(repository.criar).not.toHaveBeenCalled();
      expect(gateway.notify).not.toHaveBeenCalled();
    });

    it('rejeita honeypot preenchido sem sequer consultar o catálogo', async () => {
      const { service, buscar } = await montar();

      await expect(service.submit(dto({ website: 'http://spam.example' }), {} as Express.Multer.File)).rejects.toBeInstanceOf(ValidationError);
      expect(buscar).not.toHaveBeenCalled();
    });

    it('usa a mesma mensagem para tipo inexistente e desabilitado (não revela o catálogo)', async () => {
      const inexistente = await montar({ tipo: null });
      const desabilitado = await montar({ tipo: catalogo({ habilitado: false }) });

      const a = await inexistente.service.submit(dto(), {} as Express.Multer.File).catch((e) => e.message);
      const b = await desabilitado.service.submit(dto(), {} as Express.Multer.File).catch((e) => e.message);

      expect(a).toBe(b);
    });
  });
});
