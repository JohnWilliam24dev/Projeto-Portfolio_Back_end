import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { CreateAdicionalDto, UpdateAdicionalDto } from '../src/catalogo/dto/adicional.dto';
import { CreateTipoProdutoDto, DefinirAdicionaisDto, UpdateTipoProdutoDto } from '../src/catalogo/dto/tipo-produto.dto';

const erros = async <T extends object>(classe: new () => T, campos: Record<string, unknown>) => validate(plainToInstance(classe, campos));
const falhaEm = (lista: Awaited<ReturnType<typeof erros>>, propriedade: string) => lista.some((e) => e.property === propriedade);

describe('DTOs do catálogo', () => {
  describe('CreateTipoProdutoDto', () => {
    it('aceita um tipo válido e normaliza o nome', async () => {
      const dto = plainToInstance(CreateTipoProdutoDto, { nome: '  Modelo   Chibi  ', precoBase: 100.5 });
      expect(await validate(dto)).toHaveLength(0);
      expect(dto.nome).toBe('Modelo Chibi');
    });

    it.each([
      ['preço negativo', { precoBase: -1 }],
      ['mais de 2 casas decimais', { precoBase: 10.999 }],
      ['preço acima do limite da coluna', { precoBase: 100_000_000 }],
      ['preço como texto', { precoBase: '100' }],
      ['preço NaN', { precoBase: Number.NaN }],
    ])('rejeita precoBase com %s', async (_nome, extra) => {
      expect(falhaEm(await erros(CreateTipoProdutoDto, { nome: 'x', ...extra }), 'precoBase')).toBe(true);
    });

    it('aceita preço zero e rejeita nome vazio e habilitado que não é booleano', async () => {
      expect(await erros(CreateTipoProdutoDto, { nome: 'x', precoBase: 0 })).toHaveLength(0);
      expect(falhaEm(await erros(CreateTipoProdutoDto, { nome: '   ', precoBase: 1 }), 'nome')).toBe(true);
      expect(falhaEm(await erros(CreateTipoProdutoDto, { nome: 'x', precoBase: 1, habilitado: 'sim' }), 'habilitado')).toBe(true);
    });
  });

  describe('UpdateTipoProdutoDto', () => {
    it('todos os campos são opcionais', async () => {
      expect(await erros(UpdateTipoProdutoDto, {})).toHaveLength(0);
      expect(await erros(UpdateTipoProdutoDto, { habilitado: false })).toHaveLength(0);
    });
    it('mas os informados seguem as mesmas regras', async () => {
      expect(falhaEm(await erros(UpdateTipoProdutoDto, { precoBase: -5 }), 'precoBase')).toBe(true);
    });
  });

  describe('CreateAdicionalDto', () => {
    it('aceita preço fixo OU porcentagem (a regra "exatamente um" é do service)', async () => {
      expect(await erros(CreateAdicionalDto, { nome: 'Asas', precoFixo: 20 })).toHaveLength(0);
      expect(await erros(CreateAdicionalDto, { nome: 'Cenário', porcentagem: 10 })).toHaveLength(0);
    });
    it.each([
      ['precoFixo negativo', { precoFixo: -1 }, 'precoFixo'],
      ['precoFixo com 3 casas', { precoFixo: 1.234 }, 'precoFixo'],
      ['porcentagem negativa', { porcentagem: -0.01 }, 'porcentagem'],
      ['porcentagem acima do limite da coluna (999,99)', { porcentagem: 1000 }, 'porcentagem'],
    ])('rejeita %s', async (_nome, extra, campo) => {
      expect(falhaEm(await erros(CreateAdicionalDto, { nome: 'x', ...extra }), campo)).toBe(true);
    });
    it('rejeita descrição acima de 500 caracteres', async () => {
      expect(falhaEm(await erros(CreateAdicionalDto, { nome: 'x', precoFixo: 1, descricao: 'a'.repeat(501) }), 'descricao')).toBe(true);
    });
  });

  describe('UpdateAdicionalDto', () => {
    it('aceita descrição vazia (serve pra apagá-la)', async () => {
      expect(await erros(UpdateAdicionalDto, { descricao: '' })).toHaveLength(0);
    });
  });

  describe('DefinirAdicionaisDto', () => {
    it('aceita lista de UUIDs, inclusive vazia (desvincula tudo)', async () => {
      expect(await erros(DefinirAdicionaisDto, { adicionalIds: [randomUUID(), randomUUID()] })).toHaveLength(0);
      expect(await erros(DefinirAdicionaisDto, { adicionalIds: [] })).toHaveLength(0);
    });
    it.each([
      ['item que não é UUID', { adicionalIds: ['nao-e-uuid'] }],
      ['campo ausente', {}],
      ['não é array', { adicionalIds: randomUUID() }],
      ['mais de 100 itens', { adicionalIds: Array.from({ length: 101 }, () => randomUUID()) }],
    ])('rejeita %s', async (_nome, campos) => {
      expect(falhaEm(await erros(DefinirAdicionaisDto, campos), 'adicionalIds')).toBe(true);
    });
  });
});
