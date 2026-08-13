/**
 * Configurable CORS strategy.
 *
 * Development origins allowed (local Vite + Wrangler ports).
 * Production should use the real Tools4Genz domain(s).
 * We intentionally do NOT use `Access-Control-Allow-Origin: *`.
 */

const DEV_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://localhost:4174',
  'http://localhost:4175',
  'http://localhost:4176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:4174',
  'http://127.0.0.1:4175',
  'http://127.0.0.1:4176',
]);

/**
 * Production allowed origins.
 * NOTE: set the real domain once the custom API subdomain is finalized.
 * Keep in sync with `ALLOWED_ORIGINS` in wrangler.toml (comma-separated Vars).
 */
const PROD_ORIGINS = new Set(['https://tools4genz.com']);

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const ALLOWED_HEADERS = 'Content-Type,Authorization';

/**
 * Determine the allowed origin for this request, or null to deny.
 * Reads optional Worker binding `ALLOWED_ORIGINS` (comma-separated)
 * and falls back to the built-in DEV + PROD sets.
 */
export function getAllowedOrigin(request: Request, env: { ALLOWED_ORIGINS?: string }): string | null {
  const origin = request.headers.get('Origin');

  // Non-browser requests (no Origin header) → allow (no CORS needed)
  if (!origin) return null;

  if (DEV_ORIGINS.has(origin) || PROD_ORIGINS.has(origin)) return origin;

  // Optional runtime overrides via Worker binding
  if (env.ALLOWED_ORIGINS) {
    const extra = new Set(env.ALLOWED_ORIGINS.split(',').map((o: string) => o.trim()).filter(Boolean));
    if (extra.has(origin)) return origin;
  }

  return null;
}

/**
 * Build CORS response headers for a request, or null when the origin is denied.
 */
export function buildCorsHeaders(
  request: Request,
  env: { ALLOWED_ORIGINS?: string }
): Record<string, string> | null {
  const origin = getAllowedOrigin(request, env);
  if (!origin) return null;

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}