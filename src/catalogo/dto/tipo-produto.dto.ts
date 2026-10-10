import { ArrayMaxSize, IsArray, IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_ADICIONAIS_VINCULADOS, MAX_NOME_LENGTH, MAX_PRECO } from '../../config/catalogo.config';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';

const PRECO_INVALIDO = 'Preço base inválido.';

export class CreateTipoProdutoDto {
  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_NOME_LENGTH, { message: 'Nome inválido.' })
  nome!: string;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: PRECO_INVALIDO })
  @Min(0, { message: PRECO_INVALIDO })
  @Max(MAX_PRECO, { message: PRECO_INVALIDO })
  precoBase!: number;

  @IsOptional()
  @IsBoolean({ message: 'Habilitado inválido.' })
  habilitado?: boolean;
}

// Sem PartialType (mesma decisão do UpdateMakerDto): poucos campos, repetição mínima.
export class UpdateTipoProdutoDto {
  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_NOME_LENGTH, { message: 'Nome inválido.' })
  nome?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: PRECO_INVALIDO })
  @Min(0, { message: PRECO_INVALIDO })
  @Max(MAX_PRECO, { message: PRECO_INVALIDO })
  precoBase?: number;

  @IsOptional()
  @IsBoolean({ message: 'Habilitado inválido.' })
  habilitado?: boolean;
}

export class DefinirAdicionaisDto {
  @IsArray({ message: 'Lista de adicionais inválida.' })
  @ArrayMaxSize(MAX_ADICIONAIS_VINCULADOS, { message: 'Adicionais demais para um tipo de produto.' })
  @IsUUID(undefined, { each: true, message: 'Adicional inválido.' })
  adicionalIds!: string[];
}
