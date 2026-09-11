import { ReferenceImagePipe } from '../src/commission/validators/reference-image.pipe';
import { ValidationError } from '../src/shared/errors/domain.errors';
import { MAX_REFERENCE_FILE_SIZE } from '../src/config/commission.config';

// Paridade com test/commissionRequestValidator.test.js do backend JS: mesmos três casos,
// agora exercitados através do pipe que o Nest injeta em @UploadedFile().
function fakeFile(overrides: Partial<Express.Multer.File>): Express.Multer.File {
  return { fieldname: 'referenceFile', originalname: 'ref', encoding: '7bit', size: 0, stream: undefined as never, destination: '', filename: '', path: '', ...overrides } as Express.Multer.File;
}

describe('ReferenceImagePipe', () => {
  const pipe = new ReferenceImagePipe();

  it('aceita um arquivo com assinatura real de PNG', () => {
    const file = fakeFile({ mimetype: 'image/png', size: 8, buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) });
    expect(pipe.transform(file)).toBe(file);
  });

  it('rejeita um script disfarçado de imagem (mimetype mentindo sobre o conteúdo)', () => {
    const file = fakeFile({ mimetype: 'image/png', size: 26, buffer: Buffer.from('<script>alert(1)</script>') });
    expect(() => pipe.transform(file)).toThrow(ValidationError);
  });

  it('rejeita arquivo maior que o limite mesmo com assinatura válida', () => {
    const file = fakeFile({ mimetype: 'image/jpeg', size: MAX_REFERENCE_FILE_SIZE + 1, buffer: Buffer.from([0xff, 0xd8, 0xff]) });
    expect(() => pipe.transform(file)).toThrow(ValidationError);
  });

  it('rejeita mimetype fora da lista permitida', () => {
    const file = fakeFile({ mimetype: 'application/pdf', size: 10, buffer: Buffer.from('%PDF-1.4') });
    expect(() => pipe.transform(file)).toThrow(ValidationError);
  });
});
