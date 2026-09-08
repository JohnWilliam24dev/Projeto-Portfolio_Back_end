import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

// Espelha o bloco try/catch do commissionController.js atual: qualquer HttpException conhecida
// devolve status + mensagem dela; qualquer outra coisa vira 500 genérico, sem vazar detalhe
// interno pro cliente. O log de erro fica só no servidor.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('CommissionRequest');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = isHttpException ? exception.getResponse() : 'Não foi possível processar o pedido.';

    this.logger.error('Commission request failed', {
      statusCode,
      message: exception instanceof Error ? exception.message : 'unknown',
    });

    response.status(statusCode).json({ error: typeof message === 'string' ? message : (message as { message?: string })?.message ?? message });
  }
}
