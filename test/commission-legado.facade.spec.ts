import { Test } from '@nestjs/testing';
import { CommissionLegadoFacade } from '../src/commission-legado/commission-legado.facade';
import { CommissionLegadoService } from '../src/commission-legado/commission-legado.service';
import { ImageSanitizerService } from '../src/shared/image/image-sanitizer.service';
import { COMMISSION_LEGADO_REPOSITORY } from '../src/commission-legado/persistence/commission-legado-repository.port';
import { NOTIFICATION_GATEWAY } from '../src/commission-legado/notification/notification-gateway.port';
import { CreateCommissionLegadoDto } from '../src/commission-legado/dto/create-commission-legado.dto';

// Este é o teste que representa o "contrato público" do módulo: chama a facade,
// exatamente como um consumidor de fora do módulo faria. CommissionLegadoService continua
// tendo seu próprio spec (commission.service.spec.ts) cobrindo a orquestração interna;
// este aqui garante que a facade delega corretamente pro service.
describe('CommissionLegadoFacade', () => {
  it('delega o pedido para o CommissionLegadoService e retorna o orderId', async () => {
    let notifiedPayload: unknown;
    const events: string[] = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionLegadoFacade,
        CommissionLegadoService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async (payload: unknown) => { events.push('telegram'); notifiedPayload = payload; } } },
        { provide: COMMISSION_LEGADO_REPOSITORY, useValue: { salvar: async () => { events.push('banco'); } } },
      ],
    }).compile();

    const facade = moduleRef.get(CommissionLegadoFacade);
    const dto: CreateCommissionLegadoDto = {
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
