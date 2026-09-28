import { Test } from '@nestjs/testing';
import { CommissionFacade } from '../src/commission/commission.facade';
import { CommissionService } from '../src/commission/commission.service';
import { ImageSanitizerService } from '../src/shared/image/image-sanitizer.service';
import { COMMISSION_REPOSITORY } from '../src/commission/persistence/commission-repository.port';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';

// Este é o teste que representa o "contrato público" do módulo: chama a facade,
// exatamente como um consumidor de fora do módulo faria. CommissionService continua
// tendo seu próprio spec (commission.service.spec.ts) cobrindo a orquestração interna;
// este aqui garante que a facade delega corretamente pro service.
describe('CommissionFacade', () => {
  it('delega o pedido para o CommissionService e retorna o orderId', async () => {
    let notifiedPayload: unknown;
    const events: string[] = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionFacade,
        CommissionService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async (payload: unknown) => { events.push('telegram'); notifiedPayload = payload; } } },
        { provide: COMMISSION_REPOSITORY, useValue: { salvar: async () => { events.push('banco'); } } },
      ],
    }).compile();

    const facade = moduleRef.get(CommissionFacade);
    const dto: CreateCommissionDto = {
      nickname: 'Cliente',
      contact: '@cliente',
      modelType: 'chibi',
      additionalContentNotes: '',
      acessorios: '2',
      expressoesExtras: '1',
    };

    const result = await facade.submitCommission(dto, {} as Express.Multer.File);

    expect(result).toEqual({ orderId: expect.any(String) });
    // contrato legado preservado + persistência acontece ANTES da notificação
    expect(events).toEqual(['banco', 'telegram']);
    expect((notifiedPayload as { order: { nickname: string } }).order.nickname).toBe('Cliente');
  });
});
