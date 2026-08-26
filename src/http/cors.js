export function createCors({ allowedOrigins }) {
  const origins = new Set(allowedOrigins);
  return {
    apply(request, response) {
      const origin = request.headers.origin;
      response.setHeader('Vary', 'Origin');
      if (!origin) return true;
      if (!origins.has(origin)) return false;
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return true;
    },
  };
}
