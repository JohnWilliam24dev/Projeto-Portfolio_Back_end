import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';

const validFields = {
  nickname: 'Cliente',
  contact: '@cliente',
  modelType: 'chibi',
  additionalContentNotes: 'Cabelo azul',
  acessorios: '2',
  expressoesExtras: '1',
};

// Paridade com test/commissionRequestValidator.test.js: honeypot (campo `website` deve vir
// vazio) e quantidades não numéricas devem falhar sem "parsear parcialmente" o valor.
describe('CreateCommissionDto', () => {
  it('aceita um pedido com campos válidos', async () => {
    const dto = plainToInstance(CreateCommissionDto, validFields);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejeita quando o honeypot (campo website) vem preenchido', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields, website: 'http://spam.example' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'website')).toBe(true);
  });

  it('rejeita quantidades não numéricas em vez de parsear parcialmente', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields, acessorios: '2items' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'acessorios')).toBe(true);
  });
});
