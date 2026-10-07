export const MAKER_REPOSITORY = Symbol('MAKER_REPOSITORY');

export interface MakerPublico {
  id: string;
  nome: string;
  termosCondicoes: string | null;
  facoENaoFaco: string | null;
}

// Espelha o enum StatusTipo do schema, mas sem importar o client gerado: a porta não deve
// depender do Prisma (o adapter é quem converte).
export type StatusTipo = 'INICIAL' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';

export interface StatusInicialInput {
  nome: string;
  ordem: number;
  tipo: StatusTipo;
}

export interface CriarMakerInput {
  nome: string;
  termosCondicoes?: string;
  facoENaoFaco?: string;
  apiKeySecretHash: string;
  /** Gravados junto com o Maker, atomicamente: nunca pode existir Maker sem kanban. */
  statusIniciais: readonly StatusInicialInput[];
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
