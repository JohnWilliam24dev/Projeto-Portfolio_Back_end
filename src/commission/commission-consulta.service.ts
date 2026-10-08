import { Inject, Injectable } from '@nestjs/common';
import { NotFoundError } from '../shared/errors/domain.errors';
import { tokenPedidoValido } from '../shared/token/token.util';
import { CommissionPublica } from './commission.types';
import { COMMISSION_CONSULTA_REPOSITORY, CommissionConsultaRepository } from './persistence/commission-repository.port';

// Consulta pública por token (SGA 5.8). O token é a única "credencial", então: formato inválido
// e token inexistente respondem IGUAL (404 genérico) — quem tenta adivinhar não distingue os casos,
// e entrada malformada nem chega ao banco.
@Injectable()
export class CommissionConsultaService {
  constructor(@Inject(COMMISSION_CONSULTA_REPOSITORY) private readonly repository: CommissionConsultaRepository) {}

  async consultarPorToken(tokenInformado: string): Promise<CommissionPublica> {
    // Quem digita o token à mão pode usar minúsculas: normaliza antes de validar/consultar.
    const token = tokenInformado.trim().toUpperCase();
    if (!tokenPedidoValido(token)) throw new NotFoundError('Pedido não encontrado.');

    const registro = await this.repository.buscarPublicaPorToken(token);
    if (!registro) throw new NotFoundError('Pedido não encontrado.');

    return {
      status: registro.status,
      tipoProduto: registro.tipoProduto,
      precoSimulado: registro.precoSimulado.toFixed(2),
      orcamentoFinal: registro.orcamentoFinal ? registro.orcamentoFinal.toFixed(2) : null,
      criadoEm: registro.criadoEm.toISOString(),
    };
  }
}
