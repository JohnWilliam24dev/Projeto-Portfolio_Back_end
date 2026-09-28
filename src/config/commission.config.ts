// Config do fluxo LEGADO (/commission): contrato antigo, catálogo fixo em código.
// Regras de imagem vivem em reference-image.config.ts (compartilhado com /produto).
export const MODEL_LABELS: Readonly<Record<string, string>> = Object.freeze({
  chibi: 'Modelo Chibi 3D',
  basico: 'Modelo Básico 3D',
  medio: 'Modelo Médio 3D',
  outros: 'Outros',
});
