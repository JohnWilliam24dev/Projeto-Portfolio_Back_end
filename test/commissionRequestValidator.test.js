import assert from 'node:assert/strict';
import test from 'node:test';
import { validateCommissionRequest } from '../src/validators/commissionRequestValidator.js';
import { ValidationError } from '../src/shared/errors/HttpError.js';

const validFields = {
  nickname: 'Cliente',
  contact: '@cliente',
  modelType: 'chibi',
  additionalContentNotes: 'Cabelo azul',
  acessorios: '2',
  expressoesExtras: '1',
};

test('accepts a request with a real PNG signature', () => {
  const order = validateCommissionRequest({
    fields: validFields,
    referenceFile: {
      mimeType: 'image/png',
      tooLarge: false,
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    },
  });

  assert.equal(order.nickname, 'Cliente');
  assert.equal(order.acessorios, 2);
});

test('rejects a script disguised as an image', () => {
  assert.throws(
    () => validateCommissionRequest({
      fields: validFields,
      referenceFile: { mimeType: 'image/png', tooLarge: false, buffer: Buffer.from('<script>alert(1)</script>') },
    }),
    ValidationError,
  );
});

test('rejects non-numeric quantities instead of partially parsing them', () => {
  assert.throws(
    () => validateCommissionRequest({
      fields: { ...validFields, acessorios: '2items' },
      referenceFile: { mimeType: 'image/jpeg', tooLarge: false, buffer: Buffer.from([0xff, 0xd8, 0xff]) },
    }),
    ValidationError,
  );
});
