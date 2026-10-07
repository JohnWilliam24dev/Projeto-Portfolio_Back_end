/**
 * Superfície pública do módulo de comissão.
 *
 * Convenção do projeto (vale pra todo módulo novo, não só este): quem importa
 * `commission-legado/` de fora nunca deve alcançar `CommissionLegadoService`, `ImageSanitizerService`,
 * o `NotificationGateway` ou seus adapters — esses são detalhes internos.
 *
 * Só saem daqui:
 *  - `CommissionLegadoModule`  → necessário pra registrar o módulo em `AppModule` (wiring de DI).
 *  - `CommissionLegadoFacade`  → o único jeito de "conversar" com este módulo em runtime.
 *  - `CreateCommissionLegadoDto` → não é lógica interna, é o formato de entrada que a facade exige
 *    pra ser chamada. Sem isso, quem consome a facade não teria como montar o argumento.
 *
 * Qualquer outro arquivo do módulo (service, pipe, gateway, adapters) é importado direto
 * pelos arquivos DENTRO de `commission-legado/`, nunca por `import { X } from '../commission-legado'`
 * vindo de outro módulo.
 */
export { CommissionLegadoModule } from './commission-legado.module';
export { CommissionLegadoFacade } from './commission-legado.facade';
export { CreateCommissionLegadoDto } from './dto/create-commission-legado.dto';
