import { createCommissionController as createController } from '../controllers/commissionController.js';
import { createTelegramNotificationGateway } from '../gateways/telegramNotificationGateway.js';
import { createCors } from '../http/cors.js';
import { parseMultipartRequest } from '../parsers/multipartRequestParser.js';
import { createCommissionService } from '../services/commissionService.js';
import { createReferenceImageSanitizer } from '../services/referenceImageSanitizer.js';
import { validateCommissionRequest } from '../validators/commissionRequestValidator.js';

function readAllowedOrigins(value) {
  return (value ?? '').split(',').map((origin) => origin.trim()).filter(Boolean);
}

export function createCommissionController() {
  const notificationGateway = createTelegramNotificationGateway({ token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID });
  const commissionService = createCommissionService({ validator: validateCommissionRequest, imageSanitizer: createReferenceImageSanitizer(), notificationGateway });
  return createController({ cors: createCors({ allowedOrigins: readAllowedOrigins(process.env.ALLOWED_ORIGINS) }), multipartParser: parseMultipartRequest, commissionService });
}
