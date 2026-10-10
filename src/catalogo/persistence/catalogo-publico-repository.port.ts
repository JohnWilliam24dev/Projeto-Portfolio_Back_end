import { Prisma } from '../../shared/prisma/prisma-client';

export const CATALOGO_PUBLICO_REPOSITORY = Symbol('CATALOGO_PUBLICO_REPOSITORY');

export interface AdicionalPublicoRegistro {
  id: string;
  nome: string;
  descricao: string | null;
  precoFixo: Prisma.Decimal | null;
  porcentagem: Prisma.Decimal | null;
}

export interface TipoProdutoPublicoRegistro {
  id: string;
  nome: string;
  precoBase: Prisma.Decimal;
  adicionais: AdicionalPublicoRegistro[];
}

export interface CatalogoPublicoRegistro {
  tipos: TipoProdutoPublicoRegistro[];
}

export interface CatalogoPublicoRepository {
  /** Só tipos habilitados e, dentro deles, só adicionais vinculados E habilitados. null se o Maker não existe. */
  buscarPorMaker(makerId: string): Promise<CatalogoPublicoRegistro | null>;
}
