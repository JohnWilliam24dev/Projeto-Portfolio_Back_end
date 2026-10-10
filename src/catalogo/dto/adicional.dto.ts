import { IsBoolean, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MAX_DESCRICAO_ADICIONAL_LENGTH, MAX_NOME_LENGTH, MAX_PORCENTAGEM, MAX_PRECO } from '../../config/catalogo.config';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';

const PRECO_FIXO_INVALIDO = 'Preço fixo inválido.';
const PORCENTAGEM_INVALIDA = 'Porcentagem inválida.';

// O DTO valida o FORMATO de cada campo; a regra "exatamente um entre preço fixo e porcentagem"
// é regra de negócio e vive em adicional-preco.util.ts (com o CHECK do banco como rede de segurança).
export class CreateAdicionalDto {
  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_NOME_LENGTH, { message: 'Nome inválido.' })
  nome!: string;

  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(0, MAX_DESCRICAO_ADICIONAL_LENGTH, { message: 'Descrição muito longa.' })
  descricao?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: PRECO_FIXO_INVALIDO })
  @Min(0, { message: PRECO_FIXO_INVALIDO })
  @Max(MAX_PRECO, { message: PRECO_FIXO_INVALIDO })
  precoFixo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: PORCENTAGEM_INVALIDA })
  @Min(0, { message: PORCENTAGEM_INVALIDA })
  @Max(MAX_PORCENTAGEM, { message: PORCENTAGEM_INVALIDA })
  porcentagem?: number;

  @IsOptional()
  @IsBoolean({ message: 'Habilitado inválido.' })
  habilitado?: boolean;
}

export class UpdateAdicionalDto {
  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_NOME_LENGTH, { message: 'Nome inválido.' })
  nome?: string;

  // String vazia apaga a descrição.
  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(0, MAX_DESCRICAO_ADICIONAL_LENGTH, { message: 'Descrição muito longa.' })
  descricao?: string;

  // Informar um dos dois TROCA a regra de preço (o outro é zerado).
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: PRECO_FIXO_INVALIDO })
  @Min(0, { message: PRECO_FIXO_INVALIDO })
  @Max(MAX_PRECO, { message: PRECO_FIXO_INVALIDO })
  precoFixo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: PORCENTAGEM_INVALIDA })
  @Min(0, { message: PORCENTAGEM_INVALIDA })
  @Max(MAX_PORCENTAGEM, { message: PORCENTAGEM_INVALIDA })
  porcentagem?: number;

  @IsOptional()
  @IsBoolean({ message: 'Habilitado inválido.' })
  habilitado?: boolean;
}
