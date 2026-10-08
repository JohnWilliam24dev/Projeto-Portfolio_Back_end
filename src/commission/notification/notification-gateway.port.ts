import { NotifyPayload } from '../commission.types';

// A "porta": o service depende só disso. E-mail ou WhatsApp vira só outra classe que implementa
// este contrato, trocando o `useClass` no commission.module.ts.
export const NOTIFICATION_GATEWAY = Symbol('NOTIFICATION_GATEWAY');

export interface NotificationGateway {
  notify(payload: NotifyPayload): Promise<void>;
}
