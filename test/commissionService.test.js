import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommissionService } from '../src/services/commissionService.js';

test('coordinates its collaborators without depending on Telegram', async () => {
  let notificationPayload;
  const service = createCommissionService({
    validator: () => ({ nickname: 'Cliente' }),
    imageSanitizer: { sanitize: async () => ({ buffer: Buffer.from('safe'), mimeType: 'image/jpeg', extension: 'jpg' }) },
    notificationGateway: { notify: async (payload) => (notificationPayload = payload) },
    idGenerator: () => 'order-123',
  });

  const result = await service.submit({ fields: {}, referenceFile: {} });

  assert.deepEqual(result, { orderId: 'order-123' });
  assert.equal(notificationPayload.orderId, 'order-123');
  assert.equal(notificationPayload.order.nickname, 'Cliente');
});
