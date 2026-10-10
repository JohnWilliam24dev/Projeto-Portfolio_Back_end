import { CatalogoConsultaService } from '../src/catalogo/catalogo-consulta.service';
import { CatalogoPublicoRegistro } from '../src/catalogo/persistence/catalogo-publico-repository.port';
import { NotFoundError } from '../src/shared/errors/domain.errors';
import { Prisma } from '../src/shared/prisma/prisma-client';

const D = (v: string | number) => new Prisma.Decimal(v);

const catalogo: CatalogoPublicoRegistro = {
  tipos: [
    {
      id: 't1',
      nome: 'Chibi',
      precoBase: D('100.50'),
      adicionais: [
        { id: 'a1', nome: 'Asas', descricao: 'Asas grandes', precoFixo: D(20), porcentagem: null },
        { id: 'a2', nome: 'Cenário', descricao: null, precoFixo: null, porcentagem: D(1) },
      ],
    },
  ],
};

describe('CatalogoConsultaService', () => {
  it('devolve os valores como string e já calcula o valor unitário de cada adicional NESTE tipo', async () => {
    const service = new CatalogoConsultaService({ buscarPorMaker: async () => catalogo });

    const { tipos } = await service.consultar('maker-1');

    expect(tipos[0]).toMatchObject({ id: 't1', nome: 'Chibi', precoBase: '100.50' });
    expect(tipos[0].adicionais[0]).toEqual({ id: 'a1', nome: 'Asas', descricao: 'Asas grandes', precoFixo: '20.00', porcentagem: null, valorUnitario: '20.00' });
    // 1% de 100,50 = 1,005 -> ROUND_HALF_UP -> 1,01 (a mesma conta que o POST /commissions usa pra cobrar)
    expect(tipos[0].adicionais[1]).toEqual({ id: 'a2', nome: 'Cenário', descricao: null, precoFixo: null, porcentagem: '1.00', valorUnitario: '1.01' });
  });

  it('não expõe makerId, habilitado nem datas', async () => {
    const service = new CatalogoConsultaService({ buscarPorMaker: async () => catalogo });
    const json = JSON.stringify(await service.consultar('maker-1')).toLowerCase();
    for (const proibido of ['makerid', 'habilitado', 'criadoem']) expect(json).not.toContain(proibido);
  });

  it('Maker sem nada habilitado devolve lista vazia (200), não erro', async () => {
    const service = new CatalogoConsultaService({ buscarPorMaker: async () => ({ tipos: [] }) });
    expect(await service.consultar('maker-1')).toEqual({ tipos: [] });
  });

  it('Maker inexistente: 404', async () => {
    const service = new CatalogoConsultaService({ buscarPorMaker: async () => null });
    await expect(service.consultar('nao-existe')).rejects.toBeInstanceOf(NotFoundError);
  });
});
