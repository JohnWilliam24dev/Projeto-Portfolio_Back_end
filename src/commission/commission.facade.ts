import { Injectable } from '@nestjs/common';
import { CommissionConsultaService } from './commission-consulta.service';
import { CommissionService } from './commission.service';
import { CommissionPublica } from './commission.types';
import { CreateCommissionDto } from './dto/create-commission.dto';

/**
 * Convenção do projeto: todo módulo expõe UMA facade, o único ponto de contato público. Quem está
 * fora do módulo (controller incluso) nunca injeta CommissionService, CommissionConsultaService,
 * ImageSanitizerService nem o NotificationGateway — são detalhe de implementação.
 */
@Injectable()
export class CommissionFacade {
  constructor(
    private readonly commissionService: CommissionService,
    private readonly consultaService: CommissionConsultaService,
  ) {}

  async submitCommission(dto: CreateCommissionDto, referenceFile: Express.Multer.File): Promise<{ token: string }> {
    return this.commissionService.submit(dto, referenceFile);
  }

  async consultarPorToken(token: string): Promise<CommissionPublica> {
    return this.consultaService.consultarPorToken(token);
  }
}
