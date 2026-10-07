import { StatusInicialInput } from './persistence/maker-repository.port';

// Regra de negócio (SGA 5.2): todo Maker nasce com um kanban mínimo que satisfaz as invariantes
// de status — exatamente 1 INICIAL e ao menos 1 CONCLUIDO e 1 CANCELADO. Nome e ordem são só
// o ponto de partida: o Maker pode renomear e reordenar depois; o `tipo` é o que o sistema usa.
export const STATUS_PADRAO: readonly StatusInicialInput[] = Object.freeze([
  { nome: 'Fila', ordem: 1, tipo: 'INICIAL' },
  { nome: 'Em andamento', ordem: 2, tipo: 'EM_ANDAMENTO' },
  { nome: 'Concluído', ordem: 3, tipo: 'CONCLUIDO' },
  { nome: 'Cancelado', ordem: 4, tipo: 'CANCELADO' },
]);
