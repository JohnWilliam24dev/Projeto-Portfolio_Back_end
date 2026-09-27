import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  /** Preenchido pelo ApiKeyGuard após validar a credencial. */
  makerId: string;
}
