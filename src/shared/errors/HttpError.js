export class HttpError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends HttpError {
  constructor(message) { super(message, 400); }
}

export class PayloadTooLargeError extends HttpError {
  constructor(message) { super(message, 413); }
}

export class IntegrationError extends HttpError {
  constructor(message = 'Não foi possível encaminhar o pedido agora.') { super(message, 502); }
}
