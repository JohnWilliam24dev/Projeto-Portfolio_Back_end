/**
 * Superfície pública do módulo de commission (fluxo novo do SGA). Mesma convenção dos demais:
 * de fora, ninguém alcança CommissionService, CommissionConsultaService, ImageSanitizerService,
 * o NotificationGateway ou os adapters — só a facade e o necessário pra montá-la.
 *
 * (O fluxo antigo vive em `commission-legado/`, com rota própria e contrato congelado.)
 */
export { CommissionModule } from './commission.module';
export { CommissionFacade } from './commission.facade';
export { CreateCommissionDto } from './dto/create-commission.dto';
