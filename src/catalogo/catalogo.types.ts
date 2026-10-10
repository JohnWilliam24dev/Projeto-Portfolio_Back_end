// Formas de resposta da API do catálogo. Valores monetários SEMPRE como string de 2 casas
// ("20.00"): sem float no caminho, e o front não precisa saber arredondar.

export interface TipoProdutoResposta {
  id: string;
  nome: string;
  precoBase: string;
  habilitado: boolean;
  criadoEm: string;
  adicionalIds: string[];
}

export interface AdicionalResposta {
  id: string;
  nome: string;
  descricao: string | null;
  precoFixo: string | null;
  porcentagem: string | null;
  habilitado: boolean;
  criadoEm: string;
}

export interface AdicionalPublicoResposta {
  id: string;
  nome: string;
  descricao: string | null;
  precoFixo: string | null;
  porcentagem: string | null;
  /** Quanto este adicional custa (1 unidade) NESTE tipo de produto, já arredondado. */
  valorUnitario: string;
}

export interface TipoProdutoPublicoResposta {
  id: string;
  nome: string;
  precoBase: string;
  adicionais: AdicionalPublicoResposta[];
}

export interface CatalogoPublicoResposta {
  tipos: TipoProdutoPublicoResposta[];
}
