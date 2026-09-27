/**
 * Superfície pública do módulo maker — mesma convenção documentada em commission/index.ts:
 * só sai daqui o necessário pra registrar o módulo e pra outro módulo eventualmente chamá-lo
 * (hoje ninguém chama MakerService de fora; o controller HTTP é a única entrada).
 */
export { MakerModule } from './maker.module';
