import Busboy from 'busboy';
import { MAX_REFERENCE_FILE_SIZE } from '../config/commission.js';
import { ValidationError } from '../shared/errors/HttpError.js';

const limits = { files: 1, fields: 8, parts: 10, fileSize: MAX_REFERENCE_FILE_SIZE, fieldSize: 2_000 };

export function parseMultipartRequest(request) {
  return new Promise((resolve, reject) => {
    if (!(request.headers['content-type'] ?? '').startsWith('multipart/form-data')) {
      reject(new ValidationError('Envie o pedido no formato multipart/form-data.'));
      return;
    }
    const fields = {};
    let referenceFile = null;
    let parseError = null;
    const parser = Busboy({ headers: request.headers, limits });
    parser.on('field', (name, value) => {
      if (Object.hasOwn(fields, name)) parseError ??= new ValidationError('Campo duplicado no pedido.');
      else fields[name] = value;
    });
    parser.on('file', (name, file, info) => {
      if (name !== 'referenceFile' || referenceFile) {
        parseError ??= new ValidationError('Envie apenas uma imagem de referência.');
        file.resume();
        return;
      }
      const chunks = [];
      let tooLarge = false;
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => (tooLarge = true));
      file.on('end', () => (referenceFile = { buffer: Buffer.concat(chunks), mimeType: info.mimeType, tooLarge }));
    });
    parser.on('filesLimit', () => (parseError ??= new ValidationError('Envie apenas uma imagem de referência.')));
    parser.on('fieldsLimit', () => (parseError ??= new ValidationError('Pedido inválido.')));
    parser.on('partsLimit', () => (parseError ??= new ValidationError('Pedido inválido.')));
    parser.on('error', reject);
    parser.on('close', () => (parseError ? reject(parseError) : resolve({ fields, referenceFile })));
    request.pipe(parser);
  });
}
