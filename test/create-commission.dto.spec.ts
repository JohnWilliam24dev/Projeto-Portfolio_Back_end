import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';

const validFields = () => ({
  tipoProdutoId: randomUUID(),
  nomeCliente: 'Cliente',
  contato: '@cliente',
  descricao: 'Quero um chibi com cabelo azul',
  adicionais: JSON.stringify([{ tipoAdicionalId: randomUUID(), descricao: 'Asas de dragão azuis' }]),
});

// Paridade com test/commissionRequestValidator.test.js: honeypot (campo `website` deve vir
// vazio) e formatos inválidos devem falhar sem "parsear parcialmente" o valor. A novidade
// aqui é `adicionais`: chega como string JSON (multipart não tem array nativo) e precisa
// ser decodificado + validado item a item.
describe('CreateCommissionDto', () => {
  it('aceita um pedido com campos válidos, decodificando os adicionais enviados como JSON', async () => {
    const dto = plainToInstance(CreateCommissionDto, validFields());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.adicionais).toHaveLength(1);
  });

  it('aceita um pedido sem nenhum adicional selecionado', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields(), adicionais: undefined });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.adicionais).toEqual([]);
  });

  it('rejeita quando o honeypot (campo website) vem preenchido', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields(), website: 'http://spam.example' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'website')).toBe(true);
  });

  it('rejeita tipoProdutoId que não é um UUID', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields(), tipoProdutoId: 'nao-e-uuid' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'tipoProdutoId')).toBe(true);
  });

  it('rejeita JSON malformado no campo adicionais em vez de aceitar silenciosamente', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields(), adicionais: '{not valid json' });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'adicionais')).toBe(true);
  });

  it('rejeita um item de adicional sem tipoAdicionalId válido', async () => {
    const dto = plainToInstance(CreateCommissionDto, {
      ...validFields(),
      adicionais: JSON.stringify([{ tipoAdicionalId: 'nao-e-uuid', descricao: 'x' }]),
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'adicionais')).toBe(true);
  });
});
