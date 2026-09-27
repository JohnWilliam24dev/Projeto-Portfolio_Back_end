import { IsOptional, IsString, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';

export class CreateMakerDto {
  @Transform(sanitizeText)
  @IsString()
  @Length(1, 80, { message: 'Nome inválido.' })
  nome!: string;

  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(0, 5_000, { message: 'Termos e condições muito longos.' })
  termosCondicoes?: string;

  @IsOptional()
  @Transform(sanitizeText)
  @IsString()
  @Length(0, 2_000, { message: 'Descrição de "faço e não faço" muito longa.' })
  facoENaoFaco?: string;
}
