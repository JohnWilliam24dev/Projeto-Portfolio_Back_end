import { randomUUID } from 'node:crypto';

export function createCommissionService({ validator, imageSanitizer, notificationGateway, idGenerator = randomUUID }) {
  return {
    async submit({ fields, referenceFile }) {
      const order = validator({ fields, referenceFile });
      const safeReferenceFile = await imageSanitizer.sanitize(referenceFile);
      const orderId = idGenerator();
      await notificationGateway.notify({ orderId, order, referenceFile: safeReferenceFile });
      return { orderId };
    },
  };
}
