import { Test } from '@nestjs/testing';
import { CommissionFacade } from '../src/commission/commission.facade';
import { CommissionService } from '../src/commission/commission.service';
import { ImageSanitizerService } from '../src/commission/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import { COMMISSION_REPOSITORY } from '../src/commission/persistence/commission-repository.port';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';
import { Prisma } from '../src/shared/prisma/prisma-client';

// Este é o teste que representa o "contrato público" do módulo: chama a facade,
// exatamente como um consumidor de fora do módulo faria. CommissionService continua
// tendo seu próprio spec (commission.service.spec.ts) cobrindo a orquestração interna;
// este aqui garante que a facade delega corretamente pro service.
describe('CommissionFacade', () => {
  it('delega o pedido para o CommissionService e devolve o token gerado no banco', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionFacade,
        CommissionService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        {
          provide: COMMISSION_REPOSITORY,
          useValue: {
            buscarTipoProdutoComAdicionais: async () => ({
              id: 'tipo-produto-1',
              makerId: 'maker-1',
              nome: 'Modelo Chibi 3D',
              precoMedio: new Prisma.Decimal(100),
              adicionaisPermitidos: new Map(),
            }),
            criarPedido: async () => ({ id: 'pedido-uuid-interno', token: 'AB12C', status: 'PENDENTE' }),
          },
        },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async () => {} } },
      ],
    }).compile();

    const facade = moduleRef.get(CommissionFacade);
    const dto: CreateCommissionDto = {
      tipoProdutoId: 'tipo-produto-1',
      nomeCliente: 'Cliente',
      contato: '@cliente',
      descricao: 'Quero um chibi com cabelo azul',
      adicionais: [],
    } as CreateCommissionDto;

    const result = await facade.submitCommission(dto, {} as Express.Multer.File);

    expect(result).toEqual({ token: 'AB12C' });
  });
});
