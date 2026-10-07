import { Test } from '@nestjs/testing';
import { CommissionLegadoService } from '../src/commission-legado/commission-legado.service';
import { ImageSanitizerService } from '../src/shared/image/image-sanitizer.service';
import { COMMISSION_LEGADO_REPOSITORY } from '../src/commission-legado/persistence/commission-legado-repository.port';
import { NOTIFICATION_GATEWAY } from '../src/commission-legado/notification/notification-gateway.port';
import { CreateCommissionLegadoDto } from '../src/commission-legado/dto/create-commission-legado.dto';

// Mesmo espírito do teste atual em test/commissionService.test.js: comprova que o service
// coordena suas dependências via a porta NotificationGateway, sem depender de Telegram de verdade.
describe('CommissionLegadoService', () => {
  it('coordena suas colaboradoras sem depender do Telegram', async () => {
    let notifiedPayload: unknown;
    const events: string[] = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionLegadoService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async (payload: unknown) => { events.push('telegram'); notifiedPayload = payload; } } },
        { provide: COMMISSION_LEGADO_REPOSITORY, useValue: { salvar: async () => { events.push('banco'); } } },
      ],
    }).compile();

    const service = moduleRef.get(CommissionLegadoService);
    const dto: CreateCommissionLegadoDto = {
      nickname: 'Cliente',
      contact: '@cliente',
      modelType: 'chibi',
      additionalContentNotes: '',
      acessorios: '2',
      expressoesExtras: '1',
    };

    const result = await service.submit(dto, {} as Express.Multer.File);

    expect(result).toEqual({ orderId: expect.any(String) });
    // contrato legado preservado + persistência acontece ANTES da notificação
    expect(events).toEqual(['banco', 'telegram']);
    expect((notifiedPayload as { order: { nickname: string } }).order.nickname).toBe('Cliente');
  });

  it('rejeita quantidade negativa, decimal ou acima do teto, sem salvar nem notificar', async () => {
    const events: string[] = [];
    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionLegadoService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async () => { events.push('telegram'); } } },
        { provide: COMMISSION_LEGADO_REPOSITORY, useValue: { salvar: async () => { events.push('banco'); } } },
      ],
    }).compile();
    const service = moduleRef.get(CommissionLegadoService);
    const base = { nickname: 'Cliente', contact: '@cliente', modelType: 'chibi', additionalContentNotes: '', expressoesExtras: '1' };

    for (const acessorios of ['-1', '1.5', '21']) {
      await expect(service.submit({ ...base, acessorios } as CreateCommissionLegadoDto, {} as Express.Multer.File)).rejects.toThrow();
    }
    expect(events).toEqual([]);
  });
});
