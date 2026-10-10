import { Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { NotFoundError } from '../errors/domain.errors';

// Id de rota que não é UUID não pode chegar ao banco (colunas @db.Uuid estouram erro de cast do
// Postgres => 500). Responde 404 igual a "não existe": quem sonda ids não distingue os casos.
@Injectable()
export class ParseUuidOr404Pipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUUID(value)) throw new NotFoundError('Recurso não encontrado.');
    return value;
  }
}
