import { randomUUID } from 'node:crypto';
import {
  AdicionalRegistro,
  AdicionalRepository,
} from '../../src/catalogo/persistence/adicional-repository.port';
import { CatalogoPublicoRepository } from '../../src/catalogo/persistence/catalogo-publico-repository.port';
import { TipoProdutoRegistro, TipoProdutoRepository } from '../../src/catalogo/persistence/tipo-produto-repository.port';
import { Prisma } from '../../src/shared/prisma/prisma-client';

// Implementação EM MEMÓRIA das portas do catálogo, pra testar a camada HTTP (guards, pipes, DTOs,
// status codes) sem banco. Respeita o contrato de isolamento: tudo é filtrado por makerId.
// O isolamento contra o banco de verdade é coberto pelos testes de integração.
export function criarCatalogoEmMemoria(makersExistentes: string[]) {
  const tipos = new Map<string, { makerId: string; registro: TipoProdutoRegistro }>();
  const adicionais = new Map<string, { makerId: string; registro: AdicionalRegistro }>();
  const emUso = { tipos: new Set<string>(), adicionais: new Set<string>() };

  const doMaker = <T extends { makerId: string }>(mapa: Map<string, T>, makerId: string, id: string) => {
    const item = mapa.get(id);
    return item && item.makerId === makerId ? item : undefined;
  };

  const tipoRepo: TipoProdutoRepository = {
    listar: async (makerId) => [...tipos.values()].filter((t) => t.makerId === makerId).map((t) => t.registro),
    buscarPorId: async (makerId, id) => doMaker(tipos, makerId, id)?.registro ?? null,
    criar: async (makerId, input) => {
      const registro: TipoProdutoRegistro = { id: randomUUID(), ...input, criadoEm: new Date(), adicionalIds: [] };
      tipos.set(registro.id, { makerId, registro });
      return registro;
    },
    atualizar: async (makerId, id, input) => {
      const item = doMaker(tipos, makerId, id)!;
      Object.assign(item.registro, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
      return item.registro;
    },
    temDependencias: async (_makerId, id) => emUso.tipos.has(id),
    excluir: async (makerId, id) => { if (doMaker(tipos, makerId, id)) tipos.delete(id); },
    definirAdicionais: async (makerId, id, adicionalIds) => { doMaker(tipos, makerId, id)!.registro.adicionalIds = adicionalIds; },
  };

  const adicionalRepo: AdicionalRepository = {
    listar: async (makerId) => [...adicionais.values()].filter((a) => a.makerId === makerId).map((a) => a.registro),
    buscarPorId: async (makerId, id) => doMaker(adicionais, makerId, id)?.registro ?? null,
    criar: async (makerId, input) => {
      const registro: AdicionalRegistro = { id: randomUUID(), ...input, criadoEm: new Date() };
      adicionais.set(registro.id, { makerId, registro });
      return registro;
    },
    atualizar: async (makerId, id, input) => {
      const item = doMaker(adicionais, makerId, id)!;
      Object.assign(item.registro, Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)));
      return item.registro;
    },
    temUso: async (_makerId, id) => emUso.adicionais.has(id),
    excluir: async (makerId, id) => { if (doMaker(adicionais, makerId, id)) adicionais.delete(id); },
    contarPorIds: async (makerId, ids) => ids.filter((id) => doMaker(adicionais, makerId, id)).length,
  };

  const publicoRepo: CatalogoPublicoRepository = {
    buscarPorMaker: async (makerId) => {
      if (!makersExistentes.includes(makerId)) return null;
      const porNome = <T extends { nome: string }>(a: T, b: T) => a.nome.localeCompare(b.nome);
      return {
        tipos: [...tipos.values()]
          .filter((t) => t.makerId === makerId && t.registro.habilitado)
          .map((t) => t.registro)
          .sort(porNome)
          .map((t) => ({
            id: t.id,
            nome: t.nome,
            precoBase: t.precoBase as Prisma.Decimal,
            adicionais: t.adicionalIds
              .map((id) => adicionais.get(id)?.registro)
              .filter((a): a is AdicionalRegistro => !!a && a.habilitado)
              .sort(porNome)
              .map(({ id, nome, descricao, precoFixo, porcentagem }) => ({ id, nome, descricao, precoFixo, porcentagem })),
          })),
      };
    },
  };

  return { tipoRepo, adicionalRepo, publicoRepo, emUso };
}
