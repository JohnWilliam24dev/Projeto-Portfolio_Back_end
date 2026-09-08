import { HttpException, HttpStatus } from '@nestjs/common';

// Mantém o mesmo vocabulário de erros do serviço atual (ValidationError, PayloadTooLargeError,
// IntegrationError), só que expresso como HttpException do Nest para se integrar nativamente
// com o ExceptionFilter global e com o pipeline de pipes/guards.

export class ValidationError extends HttpException {
  constructor(message = 'Pedido inválido.') {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class PayloadTooLargeError extends HttpException {
  constructor(message = 'Arquivo grande demais. O limite é 5 MB.') {
    super(message, HttpStatus.PAYLOAD_TOO_LARGE);
  }
}

export class IntegrationError extends HttpException {
  constructor(message = 'Não foi possível encaminhar o pedido agora.') {
    super(message, HttpStatus.BAD_GATEWAY);
  }
}
