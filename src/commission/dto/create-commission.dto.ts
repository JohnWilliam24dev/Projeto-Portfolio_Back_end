import { ArrayMaxSize, IsArray, IsEmail, IsEmpty, IsOptional, IsString, IsUUID, Length, MaxLength, ValidateNested } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { MAX_ADICIONAIS_POR_COMMISSION, MAX_DESCRICAO_LENGTH, MAX_EMAIL_LENGTH } from '../../config/commission.config';
import { sanitizeText } from '../../shared/dto/sanitize-text.transform';
import { AdicionalSelecionadoDto } from './adicional-selecionado.dto';

// `adicionais` chega como campo de texto no multipart/form-data (o front serializa o array em
// JSON): não existe forma nativa de mandar array aninhado em multipart. Ausente/vazio vira lista
// vazia; string presente é decodificada como JSON. JSON inválido (ou que não seja array) volta
// como veio, pro @IsArray() acusar o erro de formato em vez de mascará-lo.
//
// Os itens são instanciados aqui (e não via @Type) porque um @Transform customizado faz o
// class-transformer usar o valor retornado como final; sem instância, @ValidateNested não validaria.
const parseAdicionais = ({ value }: { value: unknown }) => {
  if (value === undefined || value === null || value === '') return [];
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return parsed;
    }
  }
  if (!Array.isArray(parsed)) return parsed;
  return plainToInstance(AdicionalSelecionadoDto, parsed);
};

// E-mail é opcional: campo vazio no formulário vira "ausente", não "e-mail inválido".
const emailOpcional = ({ value }: { value: unknown }) => {
  const texto = sanitizeText({ value });
  return texto === '' ? undefined : texto;
};

export class CreateCommissionDto {
  @IsUUID(undefined, { message: 'Tipo de produto inválido.' })
  tipoProdutoId!: string;

  @Transform(sanitizeText)
  @IsString()
  @Length(1, 80, { message: 'Nome do cliente inválido.' })
  nomeCliente!: string;

  @Transform(sanitizeText)
  @IsString()
  @Length(1, 160, { message: 'Contato inválido.' })
  contato!: string;

  @IsOptional()
  @Transform(emailOpcional)
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(MAX_EMAIL_LENGTH, { message: 'E-mail inválido.' })
  email?: string;

  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_DESCRICAO_LENGTH, { message: 'Descrição inválida.' })
  descricao!: string;

  // O valor padrão cobre o campo AUSENTE do multipart (sem adicionais, o front pode simplesmente não
  // enviá-lo): o class-transformer só roda o @Transform de chaves presentes no objeto recebido.
  @Transform(parseAdicionais)
  @IsArray({ message: 'Lista de adicionais em formato inválido.' })
  @ArrayMaxSize(MAX_ADICIONAIS_POR_COMMISSION, { message: 'Quantidade de adicionais inválida.' })
  @ValidateNested({ each: true })
  adicionais: AdicionalSelecionadoDto[] = [];

  // Honeypot anti-bot: se vier preenchido, o pedido é descartado (checado também no service).
  @IsOptional()
  @IsEmpty({ message: 'Pedido inválido.' })
  website?: string;
}
