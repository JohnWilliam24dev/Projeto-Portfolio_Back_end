import { IsInt, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_QUANTIDADE_ADICIONAL } from '../../config/commission.config';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';

export class AdicionalSelecionadoDto {
  @IsUUID(undefined, { message: 'Adicional inválido.' })
  adicionalId!: string;

  @IsInt({ message: 'Quantidade do adicional inválida.' })
  @Min(1, { message: 'Quantidade do adicional inválida.' })
  @Max(MAX_QUANTIDADE_ADICIONAL, { message: 'Quantidade do adicional inválida.' })
  quantidade!: number;

  // Um texto só por adicional, valendo pro lote todo (ex.: 3x "expressão extra" = 1 descrição).
  @Transform(sanitizeText)
  @IsString()
  @Length(1, 500, { message: 'Descrição do adicional inválida.' })
  descricaoCliente!: string;
}
