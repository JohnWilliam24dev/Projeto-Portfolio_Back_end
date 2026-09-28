export const MAKER_REPOSITORY = Symbol('MAKER_REPOSITORY');

export interface MakerPublico {
  id: string;
  nome: string;
  termosCondicoes: string | null;
  facoENaoFaco: string | null;
}

export interface CriarMakerInput {
  nome: string;
  termosCondicoes?: string;
  facoENaoFaco?: string;
  apiKeySecretHash: string;
}

export interface AtualizarMakerInput {
  nome?: string;
  termosCondicoes?: string;
  facoENaoFaco?: string;
}

export interface MakerRepository {
  criar(input: CriarMakerInput): Promise<MakerPublico>;
  buscarPorId(id: string): Promise<MakerPublico | null>;
  atualizar(id: string, input: AtualizarMakerInput): Promise<MakerPublico>;
}
