/**
 * Superfície pública do módulo de comissão.
 *
 * Convenção do projeto (vale pra todo módulo novo, não só este): quem importa
 * `produto/` de fora nunca deve alcançar `ProdutoService`, `ImageSanitizerService`,
 * o `NotificationGateway` ou seus adapters — esses são detalhes internos.
 *
 * Só saem daqui:
 *  - `ProdutoModule`  → necessário pra registrar o módulo em `AppModule` (wiring de DI).
 *  - `ProdutoFacade`  → o único jeito de "conversar" com este módulo em runtime.
 *  - `CreateProdutoDto` → não é lógica interna, é o formato de entrada que a facade exige
 *    pra ser chamada. Sem isso, quem consome a facade não teria como montar o argumento.
 *
 * Qualquer outro arquivo do módulo (service, pipe, gateway, adapters) é importado direto
 * pelos arquivos DENTRO de `produto/`, nunca por `import { X } from '../produto'`
 * vindo de outro módulo.
 */
export { ProdutoModule } from './produto.module';
export { ProdutoFacade } from './produto.facade';
export { CreateProdutoDto } from './dto/create-produto.dto';
