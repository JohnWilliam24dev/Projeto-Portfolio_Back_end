import { NotifyPayload } from '../commission.types';

// A "porta" do hexagonal: o service depende só disso. Um gateway de e-mail ou WhatsApp
// vira só mais uma classe que implementa este contrato, exatamente como no comentário
// original do telegramNotificationGateway.js.
export const NOTIFICATION_GATEWAY = Symbol('NOTIFICATION_GATEWAY');

export interface NotificationGateway {
  notify(payload: NotifyPayload): Promise<void>;
}
