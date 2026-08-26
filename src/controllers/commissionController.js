import { MAX_REFERENCE_FILE_SIZE } from '../config/commission.js';
import { HttpError, PayloadTooLargeError } from '../shared/errors/HttpError.js';

function sendJson(response, statusCode, body) { response.status(statusCode).json(body); }

export function createCommissionController({ cors, multipartParser, commissionService }) {
  return {
    async handle(request, response) {
      if (!cors.apply(request, response)) return sendJson(response, 403, { error: 'Origem não autorizada.' });
      if (request.method === 'OPTIONS') return response.status(204).end();
      if (request.method !== 'POST') return sendJson(response, 405, { error: 'Método não permitido.' });
      try {
        if (Number(request.headers['content-length'] ?? 0) > MAX_REFERENCE_FILE_SIZE + 20_000) {
          throw new PayloadTooLargeError('Arquivo grande demais. O limite é 5 MB.');
        }
        const payload = await multipartParser(request);
        const { orderId } = await commissionService.submit(payload);
        return sendJson(response, 201, { success: true, orderId });
      } catch (error) {
        const httpError = error instanceof HttpError ? error : null;
        const statusCode = httpError?.statusCode ?? 500;
        const message = httpError?.message ?? 'Não foi possível processar o pedido.';
        console.error('Commission request failed', { statusCode, message: error instanceof Error ? error.message : 'unknown' });
        return sendJson(response, statusCode, { error: message });
      }
    },
  };
}
