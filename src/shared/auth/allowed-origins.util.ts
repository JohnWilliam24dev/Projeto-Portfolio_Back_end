// Fonte única da lista de origens permitidas: usada pelo CORS (main.ts) E pelo
// AllowedOriginGuard. Se cada um parseasse do seu jeito, a lista poderia divergir
// (ex.: CORS aceitando uma entrada com barra final que o guard rejeita, ou vice-versa).

// Origin = esquema + host + porta, sem path. O header `Origin` do navegador nunca vem com
// barra final nem em maiúsculas, então normalizamos os dois lados antes de comparar.
export function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '').toLowerCase();
}

export function parseAllowedOrigins(value: string | undefined): string[] {
  const origins = (value ?? '').split(',').map(normalizeOrigin).filter(Boolean);
  return [...new Set(origins)];
}
