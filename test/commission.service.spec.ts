import { Test } from '@nestjs/testing';
import { CommissionService } from '../src/commission/commission.service';
import { ImageSanitizerService } from '../src/commission/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import { COMMISSION_REPOSITORY } from '../src/commission/persistence/commission-repository.port';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';
import { Prisma } from '../src/shared/prisma/prisma-client';

function buildDto(overrides: Partial<CreateCommissionDto> = {}): CreateCommissionDto {
  return {
    tipoProdutoId: 'tipo-produto-1',
    nomeCliente: 'Cliente',
    contato: '@cliente',
    descricao: 'Quero um chibi com cabelo azul',
    adicionais: [{ tipoAdicionalId: 'adicional-1', descricao: 'Asas de dragão azuis' }],
    ...overrides,
  } as CreateCommissionDto;
}

const catalogoFake = {
  id: 'tipo-produto-1',
  makerId: 'maker-1',
  nome: 'Modelo Chibi 3D',
  precoMedio: new Prisma.Decimal(100),
  adicionaisPermitidos: new Map([
    ['adicional-1', { nome: 'Asas', porcentagem: null, valorFixo: new Prisma.Decimal(20) }],
  ]),
};

const sanitizerStub = { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) };

describe('CommissionService', () => {
  it('grava o pedido no banco antes de notificar, e notifica com o token (não o id interno)', async () => {
    const eventos: string[] = [];
    let payloadNotificado: any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: ImageSanitizerService, useValue: sanitizerStub },
        {
          provide: COMMISSION_REPOSITORY,
          useValue: {
            buscarTipoProdutoComAdicionais: async () => catalogoFake,
            criarPedido: async () => {
              eventos.push('banco');
              return { id: 'pedido-uuid-interno', token: 'AB12C', status: 'PENDENTE' };
            },
          },
        },
        {
          provide: NOTIFICATION_GATEWAY,
          useValue: {
            notify: async (payload: any) => {
              eventos.push('telegram');
              payloadNotificado = payload;
            },
          },
        },
      ],
    }).compile();

    const service = moduleRef.get(CommissionService);
    const result = await service.submit(buildDto(), {} as Express.Multer.File);

    expect(result).toEqual({ token: 'AB12C' });
    expect(eventos).toEqual(['banco', 'telegram']);
    expect(payloadNotificado.token).toBe('AB12C');
    expect(payloadNotificado.precoSimulado.toString()).toBe('120');
  });

  it('não derruba o pedido se o Telegram falhar — o banco já é a fonte da verdade', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: ImageSanitizerService, useValue: sanitizerStub },
        {
          provide: COMMISSION_REPOSITORY,
          useValue: {
            buscarTipoProdutoComAdicionais: async () => catalogoFake,
            criarPedido: async () => ({ id: 'pedido-uuid-interno', token: 'ZZ999', status: 'PENDENTE' }),
          },
        },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async () => { throw new Error('Telegram fora do ar'); } } },
      ],
    }).compile();

    const service = moduleRef.get(CommissionService);
    const result = await service.submit(buildDto(), {} as Express.Multer.File);

    expect(result).toEqual({ token: 'ZZ999' });
  });

  it('rejeita um adicional que não pertence ao tipo de produto escolhido, sem tocar no banco nem no Telegram', async () => {
    const criarPedido = jest.fn();
    const notify = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: ImageSanitizerService, useValue: sanitizerStub },
        { provide: COMMISSION_REPOSITORY, useValue: { buscarTipoProdutoComAdicionais: async () => catalogoFake, criarPedido } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify } },
      ],
    }).compile();

    const service = moduleRef.get(CommissionService);
    const dto = buildDto({ adicionais: [{ tipoAdicionalId: 'adicional-inexistente', descricao: 'x' } as never] });

    await expect(service.submit(dto, {} as Express.Multer.File)).rejects.toThrow();
    expect(criarPedido).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('rejeita quando o honeypot (campo website) vem preenchido, sem sequer consultar o catálogo', async () => {
    const buscarTipoProdutoComAdicionais = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: ImageSanitizerService, useValue: sanitizerStub },
        { provide: COMMISSION_REPOSITORY, useValue: { buscarTipoProdutoComAdicionais, criarPedido: jest.fn() } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    const service = moduleRef.get(CommissionService);
    const dto = buildDto({ website: 'http://spam.example' });

    await expect(service.submit(dto, {} as Express.Multer.File)).rejects.toThrow();
    expect(buscarTipoProdutoComAdicionais).not.toHaveBeenCalled();
  });
});
