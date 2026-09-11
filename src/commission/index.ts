/**
 * Superfície pública do módulo de comissão.
 *
 * Convenção do projeto (vale pra todo módulo novo, não só este): quem importa
 * `commission/` de fora nunca deve alcançar `CommissionService`, `ImageSanitizerService`,
 * o `NotificationGateway` ou seus adapters — esses são detalhes internos.
 *
 * Só saem daqui:
 *  - `CommissionModule`  → necessário pra registrar o módulo em `AppModule` (wiring de DI).
 *  - `CommissionFacade`  → o único jeito de "conversar" com este módulo em runtime.
 *  - `CreateCommissionDto` → não é lógica interna, é o formato de entrada que a facade exige
 *    pra ser chamada. Sem isso, quem consome a facade não teria como montar o argumento.
 *
 * Qualquer outro arquivo do módulo (service, pipe, gateway, adapters) é importado direto
 * pelos arquivos DENTRO de `commission/`, nunca por `import { X } from '../commission'`
 * vindo de outro módulo.
 */
export { CommissionModule } from './commission.module';
export { CommissionFacade } from './commission.facade';
export { CreateCommissionDto } from './dto/create-commission.dto';
