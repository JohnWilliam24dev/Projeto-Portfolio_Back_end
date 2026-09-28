// Remove caracteres de controle e colapsa espaços — mesmo comportamento do normalizeText()
// do validator original (backend em JS puro).
export const sanitizeText = ({ value }: { value: unknown }) =>
  String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
