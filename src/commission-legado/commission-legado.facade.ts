import { Injectable } from '@nestjs/common';
import { CommissionLegadoService } from './commission-legado.service';
import { CreateCommissionLegadoDto } from './dto/create-commission-legado.dto';

/**
 * Convenção do projeto: todo módulo expõe UMA facade, e ela é o único ponto de contato
 * público. Quem está fora do módulo (controller incluso) nunca deve injetar
 * CommissionLegadoService, ImageSanitizerService ou o NotificationGateway diretamente —
 * tudo isso é detalhe de implementação escondido atrás desta classe.
 *
 * Por quê: isola o "como" do "o quê". Amanhã o módulo pode ganhar um segundo serviço
 * (ex: geração de orçamento, fila de processamento) sem que nada fora do módulo precise
 * saber ou ser alterado — a assinatura pública da facade é o único contrato estável.
 */
@Injectable()
export class CommissionLegadoFacade {
  constructor(private readonly commissionService: CommissionLegadoService) {}

  async submitCommission(dto: CreateCommissionLegadoDto, referenceFile: Express.Multer.File): Promise<{ orderId: string }> {
    return this.commissionService.submit(dto, referenceFile);
  }
}
