import { IsEmpty, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { MODEL_LABELS } from '../../config/commission-legado.config';

// Remove caracteres de controle e colapsa espaços, igual ao normalizeText() do validator atual.
const sanitizeText = ({ value }: { value: unknown }) =>
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export class CreateCommissionLegadoDto {
  @Transform(sanitizeText)
  @IsString()
  @Length(1, 80, { message: 'Nickname inválido.' })
  nickname!: string;

  @Transform(sanitizeText)
  @IsString()
  @Length(1, 160, { message: 'Contato inválido.' })
  contact!: string;

  @IsIn(Object.keys(MODEL_LABELS), { message: 'Tipo de modelo inválido.' })
  modelType!: string;

  @Transform(sanitizeText)
  @IsOptional()
  @MaxLength(1_000)
  additionalContentNotes?: string;

  // String de 1 a 2 dígitos, sem sinal nem casas decimais: '-1', '1.5' e '+3' são formato inválido.
  // (IsNumberString aceitava esses casos.) A conversão pra number e o teto de 20 continuam
  // no service, que é onde mora a regra de negócio.
  @Matches(/^\d{1,2}$/, { message: 'Quantidade de acessórios inválida.' })
  acessorios!: string;

  @Matches(/^\d{1,2}$/, { message: 'Quantidade de expressões inválida.' })
  expressoesExtras!: string;

  // Honeypot anti-bot: se vier preenchido, o pedido é descartado (checado no controller/service).
  @IsOptional()
  @IsEmpty({ message: 'Pedido inválido.' })
  website?: string;
}
