import { ArrayMaxSize, IsArray, IsEmpty, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { MAX_ADICIONAIS_POR_PRODUTO, MAX_DESCRICAO_LENGTH } from '../../config/commission.config';
import { AdicionalSelecionadoDto } from './adicional-selecionado.dto';
import { sanitizeText } from './sanitize-text.transform';

// `adicionais` chega como campo de texto dentro do multipart/form-data (o front serializa
// o array em JSON antes de anexar) — não existe forma nativa de mandar array aninhado em
// multipart. Ausente/vazio vira lista vazia; string presente é decodificada como JSON.
// Se o JSON for inválido ou não for um array, devolve o valor bruto pro @IsArray() abaixo
// acusar o erro de formato, em vez de mascarar com um erro genérico de parsing.
//
// Instanciamos AdicionalSelecionadoDto aqui dentro (em vez de usar @Type()) porque, quando
// um campo tem @Transform customizado, o class-transformer usa o valor retornado por ele
// como final — @Type() deixa de converter os itens do array em instância, e o @ValidateNested
// abaixo não teria o que validar.
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

  @Transform(sanitizeText)
  @IsString()
  @Length(1, MAX_DESCRICAO_LENGTH, { message: 'Descrição inválida.' })
  descricao!: string;

  @Transform(parseAdicionais)
  @IsArray({ message: 'Lista de adicionais em formato inválido.' })
  @ArrayMaxSize(MAX_ADICIONAIS_POR_PRODUTO, { message: 'Quantidade de adicionais inválida.' })
  @ValidateNested({ each: true })
  adicionais!: AdicionalSelecionadoDto[];

  // Honeypot anti-bot: se vier preenchido, o pedido é descartado (checado no service).
  @IsOptional()
  @IsEmpty({ message: 'Pedido inválido.' })
  website?: string;
}
