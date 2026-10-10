import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../shared/errors/domain.errors';
import { calcularValorUnitario } from '../shared/pricing/pricing.util';
import { CatalogoPublicoResposta } from './catalogo.types';
import { CATALOGO_PUBLICO_REPOSITORY, CatalogoPublicoRepository } from './persistence/catalogo-publico-repository.port';

// Catálogo que o formulário PÚBLICO do Maker exibe. O valor unitário de cada adicional já vem
// calculado com a MESMA função (e o mesmo arredondamento) que o POST /commissions usa pra cobrar:
// o front mostra exatamente o que o servidor vai somar, sem reimplementar a conta.
@Injectable()
export class CatalogoConsultaService {
  constructor(@Inject(CATALOGO_PUBLICO_REPOSITORY) private readonly repository: CatalogoPublicoRepository) {}

  async consultar(makerId: string): Promise<CatalogoPublicoResposta> {
    const catalogo = await this.repository.buscarPorMaker(makerId);
    if (!catalogo) throw new NotFoundError('Maker não encontrado.');

    return {
      tipos: catalogo.tipos.map((tipo) => ({
        id: tipo.id,
        nome: tipo.nome,
        precoBase: tipo.precoBase.toFixed(2),
        adicionais: tipo.adicionais.map((adicional) => ({
          id: adicional.id,
          nome: adicional.nome,
          descricao: adicional.descricao,
          precoFixo: adicional.precoFixo ? adicional.precoFixo.toFixed(2) : null,
          porcentagem: adicional.porcentagem ? adicional.porcentagem.toFixed(2) : null,
          valorUnitario: calcularValorUnitario(tipo.precoBase, adicional).toFixed(2),
        })),
      })),
    };
  }
}
