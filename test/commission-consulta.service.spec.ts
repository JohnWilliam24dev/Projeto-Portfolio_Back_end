import { CommissionConsultaService } from '../src/commission/commission-consulta.service';
import { CommissionPublicaRegistro } from '../src/commission/persistence/commission-repository.port';
import { NotFoundError } from '../src/shared/errors/domain.errors';
import { Prisma } from '../src/shared/prisma/prisma-client';

const registro = (overrides: Partial<CommissionPublicaRegistro> = {}): CommissionPublicaRegistro => ({
  status: 'Em andamento',
  tipoProduto: 'Modelo Chibi 3D',
  precoSimulado: new Prisma.Decimal('150'),
  orcamentoFinal: null,
  criadoEm: new Date('2026-10-07T12:00:00.000Z'),
  ...overrides,
});

function montar(resultado: CommissionPublicaRegistro | null) {
  const buscarPublicaPorToken = jest.fn(async () => resultado);
  return { service: new CommissionConsultaService({ buscarPublicaPorToken }), buscarPublicaPorToken };
}

describe('CommissionConsultaService', () => {
  it('devolve só os campos públicos, com valores monetários como string de 2 casas', async () => {
    const { service } = montar(registro({ orcamentoFinal: new Prisma.Decimal('175.5') }));

    expect(await service.consultarPorToken('AB23C')).toEqual({
      status: 'Em andamento',
      tipoProduto: 'Modelo Chibi 3D',
      precoSimulado: '150.00',
      orcamentoFinal: '175.50',
      criadoEm: '2026-10-07T12:00:00.000Z',
    });
  });

  it('orcamentoFinal ainda não definido pelo Maker vira null', async () => {
    const { service } = montar(registro());
    expect((await service.consultarPorToken('AB23C')).orcamentoFinal).toBeNull();
  });

  it('normaliza o token digitado à mão (espaços e minúsculas) antes de consultar', async () => {
    const { service, buscarPublicaPorToken } = montar(registro());

    await service.consultarPorToken('  ab23c ');

    expect(buscarPublicaPorToken).toHaveBeenCalledWith('AB23C');
  });

  it.each(['AB1', 'ABCDEF', 'ABO23', 'AB-23', ''])('token malformado (%p) responde 404 sem ir ao banco', async (token) => {
    const { service, buscarPublicaPorToken } = montar(registro());

    await expect(service.consultarPorToken(token)).rejects.toBeInstanceOf(NotFoundError);
    expect(buscarPublicaPorToken).not.toHaveBeenCalled();
  });

  it('token inexistente e token malformado respondem IGUAL (quem tenta adivinhar não distingue)', async () => {
    const inexistente = montar(null);
    const malformado = montar(registro());

    const a = await inexistente.service.consultarPorToken('AB23C').catch((e) => e);
    const b = await malformado.service.consultarPorToken('x').catch((e) => e);

    expect(a).toBeInstanceOf(NotFoundError);
    expect(a.message).toBe(b.message);
    expect(a.getStatus()).toBe(b.getStatus());
  });
});
