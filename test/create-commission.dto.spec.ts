import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { CreateCommissionDto } from '../src/commission/dto/create-commission.dto';

const adicional = (extra: Record<string, unknown> = {}) => ({ adicionalId: randomUUID(), quantidade: 1, descricaoCliente: 'Asas de dragão azuis', ...extra });

const validFields = (): Record<string, unknown> => ({
  tipoProdutoId: randomUUID(),
  nomeCliente: 'Cliente',
  contato: '@cliente',
  email: 'cliente@exemplo.com',
  descricao: 'Quero um chibi com cabelo azul',
  adicionais: JSON.stringify([adicional()]),
});

const erros = async (campos: Record<string, unknown>) => validate(plainToInstance(CreateCommissionDto, campos));
const falhaEm = (lista: Awaited<ReturnType<typeof erros>>, propriedade: string) => lista.some((e) => e.property === propriedade);

// `adicionais` chega como string JSON (multipart não tem array nativo) e precisa ser decodificado
// e validado item a item. Honeypot e formatos inválidos falham sem "parsear parcialmente".
describe('CreateCommissionDto', () => {
  it('aceita um pedido válido, decodificando os adicionais enviados como JSON', async () => {
    const dto = plainToInstance(CreateCommissionDto, validFields());
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.adicionais).toHaveLength(1);
    expect(dto.adicionais[0].quantidade).toBe(1);
  });

  it('aceita pedido sem nenhum adicional (campo ausente vira lista vazia)', async () => {
    const dto = plainToInstance(CreateCommissionDto, { ...validFields(), adicionais: undefined });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.adicionais).toEqual([]);
  });

  it('aceita pedido em que o campo adicionais NÃO foi enviado (chave ausente, como no multipart real)', async () => {
    const { adicionais: _omitido, ...semCampo } = validFields();
    const dto = plainToInstance(CreateCommissionDto, semCampo);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.adicionais).toEqual([]);
  });

  it('e-mail é opcional: ausente ou vazio (campo em branco do formulário) é aceito e vira undefined', async () => {
    const semEmail = plainToInstance(CreateCommissionDto, { ...validFields(), email: undefined });
    const vazio = plainToInstance(CreateCommissionDto, { ...validFields(), email: '   ' });
    expect(await validate(semEmail)).toHaveLength(0);
    expect(await validate(vazio)).toHaveLength(0);
    expect(vazio.email).toBeUndefined();
  });

  it('rejeita e-mail em formato inválido', async () => {
    expect(falhaEm(await erros({ ...validFields(), email: 'nao-e-email' }), 'email')).toBe(true);
  });

  it('rejeita honeypot (campo website) preenchido', async () => {
    expect(falhaEm(await erros({ ...validFields(), website: 'http://spam.example' }), 'website')).toBe(true);
  });

  it('rejeita tipoProdutoId que não é UUID', async () => {
    expect(falhaEm(await erros({ ...validFields(), tipoProdutoId: 'nao-e-uuid' }), 'tipoProdutoId')).toBe(true);
  });

  it('rejeita JSON malformado em adicionais em vez de aceitar silenciosamente', async () => {
    expect(falhaEm(await erros({ ...validFields(), adicionais: '{not valid json' }), 'adicionais')).toBe(true);
  });

  it('rejeita adicionais que não é um array (objeto JSON)', async () => {
    expect(falhaEm(await erros({ ...validFields(), adicionais: '{"a":1}' }), 'adicionais')).toBe(true);
  });

  it.each([
    ['adicionalId que não é UUID', adicional({ adicionalId: 'nao-e-uuid' })],
    ['quantidade zero', adicional({ quantidade: 0 })],
    ['quantidade negativa', adicional({ quantidade: -1 })],
    ['quantidade acima do teto (21)', adicional({ quantidade: 21 })],
    ['quantidade decimal', adicional({ quantidade: 1.5 })],
    ['quantidade como texto', adicional({ quantidade: '2' })],
    ['descrição vazia', adicional({ descricaoCliente: '   ' })],
  ])('rejeita item de adicional com %s', async (_nome, item) => {
    const lista = await erros({ ...validFields(), adicionais: JSON.stringify([item]) });
    expect(falhaEm(lista, 'adicionais')).toBe(true);
  });

  it('aceita quantidade no teto (20) e rejeita mais de 20 itens distintos', async () => {
    const noTeto = await erros({ ...validFields(), adicionais: JSON.stringify([adicional({ quantidade: 20 })]) });
    expect(noTeto).toHaveLength(0);

    const demais = Array.from({ length: 21 }, () => adicional());
    expect(falhaEm(await erros({ ...validFields(), adicionais: JSON.stringify(demais) }), 'adicionais')).toBe(true);
  });
});
