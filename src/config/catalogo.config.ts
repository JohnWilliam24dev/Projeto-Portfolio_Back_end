// Limites do catálogo do Maker. Os tetos de preço espelham as colunas do banco
// (DECIMAL(10,2) e DECIMAL(5,2)): valor acima disso estouraria o INSERT com erro 500.
export const MAX_PRECO = 99_999_999.99;
export const MAX_PORCENTAGEM = 999.99;
export const MAX_ADICIONAIS_VINCULADOS = 100;
export const MAX_NOME_LENGTH = 80;
export const MAX_DESCRICAO_ADICIONAL_LENGTH = 500;
