import { Test } from '@nestjs/testing';
import { CommissionService } from '../src/commission/commission.service';
import { ImageSanitizerService } from '../src/commission/image/image-sanitizer.service';
import { NOTIFICATION_GATEWAY } from '../src/commission/notification/notification-gateway.port';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';

// Mesmo espírito do teste atual em test/commissionService.test.js: comprova que o service
// coordena suas dependências via a porta NotificationGateway, sem depender de Telegram de verdade.
describe('CommissionService', () => {
  it('coordena suas colaboradoras sem depender do Telegram', async () => {
    let notifiedPayload: unknown;

    const moduleRef = await Test.createTestingModule({
      providers: [
        CommissionService,
        { provide: ImageSanitizerService, useValue: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) } },
        { provide: NOTIFICATION_GATEWAY, useValue: { notify: async (payload: unknown) => { notifiedPayload = payload; } } },
      ],
    }).compile();

    const service = moduleRef.get(CommissionService);
    const dto: CreateCommissionDto = {
      nickname: 'Cliente',
      contact: '@cliente',
      modelType: 'chibi',
      additionalContentNotes: '',
      acessorios: '2',
      expressoesExtras: '1',
    };

    const result = await service.submit(dto, {} as Express.Multer.File);

    expect(result).toEqual({ orderId: expect.any(String) });
    expect((notifiedPayload as { order: { nickname: string } }).order.nickname).toBe('Cliente');
  });
});
