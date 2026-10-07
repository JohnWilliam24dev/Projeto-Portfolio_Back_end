import { MakerService } from '../src/maker/maker.service';
import { CriarMakerInput, MakerRepository } from '../src/maker/persistence/maker-repository.port';

// Instanciação direta (sem Test.createTestingModule): MakerService só tem injeção via
// construtor, sem hooks de ciclo de vida do Nest — não precisa do TestingModule pra isso.
function buildRepositoryStub(overrides: Partial<MakerRepository> = {}): MakerRepository {
  return {
    criar: async (input) => ({
      id: 'maker-1',
      nome: input.nome,
      termosCondicoes: input.termosCondicoes ?? null,
      facoENaoFaco: input.facoENaoFaco ?? null,
    }),
    buscarPorId: async (id) => (id === 'maker-1' ? { id, nome: 'Fulano', termosCondicoes: null, facoENaoFaco: null } : null),
    atualizar: async (id, input) => ({ id, nome: input.nome ?? 'Fulano', termosCondicoes: input.termosCondicoes ?? null, facoENaoFaco: input.facoENaoFaco ?? null }),
    ...overrides,
  };
}

describe('MakerService', () => {
  it('cadastra o Maker com o kanban padrão: 1 INICIAL, 1 CONCLUIDO, 1 CANCELADO, ordens 1..4', async () => {
    let statusRecebidos: CriarMakerInput['statusIniciais'] = [];
    const service = new MakerService(
      buildRepositoryStub({
        criar: async (input) => {
          statusRecebidos = input.statusIniciais;
          return { id: 'maker-1', nome: input.nome, termosCondicoes: null, facoENaoFaco: null };
        },
      }),
    );

    await service.criar({ nome: 'Fulano' });

    const tipos = statusRecebidos.map((s) => s.tipo);
    expect(tipos.filter((t) => t === 'INICIAL')).toHaveLength(1);
    expect(tipos.filter((t) => t === 'CONCLUIDO')).toHaveLength(1);
    expect(tipos.filter((t) => t === 'CANCELADO')).toHaveLength(1);
    expect(statusRecebidos.map((s) => s.ordem)).toEqual([1, 2, 3, 4]);
  });

  it('gera e devolve a API key em texto plano só na criação — nunca mais depois disso', async () => {
    const service = new MakerService(buildRepositoryStub());

    const maker = await service.criar({ nome: 'Fulano' });

    expect(maker.id).toBe('maker-1');
    expect(typeof maker.apiKey).toBe('string');
    expect(maker.apiKey).toMatch(/^maker-1\..+/);
    // A resposta pública (buscarPorId) nunca deve carregar o campo apiKey.
    const publico = await service.buscarPorId('maker-1');
    expect((publico as unknown as Record<string, unknown>).apiKey).toBeUndefined();
  });

  it('rejeita atualização quando o id da rota não é o mesmo do maker autenticado pela API key', async () => {
    const service = new MakerService(buildRepositoryStub());

    await expect(service.atualizar('maker-1', 'maker-2', { nome: 'Outro nome' })).rejects.toThrow();
  });

  it('rejeita atualização sem nenhum campo preenchido', async () => {
    const service = new MakerService(buildRepositoryStub());

    await expect(service.atualizar('maker-1', 'maker-1', {})).rejects.toThrow();
  });

  it('rejeita atualização de um maker que não existe', async () => {
    const service = new MakerService(buildRepositoryStub());

    await expect(service.atualizar('maker-inexistente', 'maker-inexistente', { nome: 'Novo nome' })).rejects.toThrow();
  });

  it('permite atualizar quando o id bate com o maker autenticado', async () => {
    const service = new MakerService(buildRepositoryStub());

    const maker = await service.atualizar('maker-1', 'maker-1', { nome: 'Novo nome' });

    expect(maker.nome).toBe('Novo nome');
  });
});
