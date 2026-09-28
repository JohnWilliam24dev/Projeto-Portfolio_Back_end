import { IsString, IsUUID, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';

export class AdicionalSelecionadoDto {
  @IsUUID(undefined, { message: 'Adicional inválido.' })
  tipoAdicionalId!: string;

  @Transform(sanitizeText)
  @IsString()
  @Length(1, 500, { message: 'Descrição do adicional inválida.' })
  descricao!: string;
}
