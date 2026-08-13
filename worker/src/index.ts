import { D1Database } from './db/repository';
import { handleHealth } from './routes/health';
import { handleCreateRequest, handleGetRequestStatus } from './routes/requests';
import { error } from './utils/api';
import { buildCorsHeaders } from './utils/cors';

/**
 * Worker environment bindings.
 * `DB` is the D1 binding (configured in wrangler.toml).
 * `ALLOWED_ORIGINS` is an optional comma-separated list of extra origins.
 */
export interface Env {
  DB?: D1Database;
  ALLOWED_ORIGINS?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // --- CORS preflight ---
    if (method === 'OPTIONS') {
      const corsHeaders = buildCorsHeaders(request, env);
      if (!corsHeaders) {
        return error('VALIDATION_ERROR', 'Origin not allowed', 403);
      }
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // --- CORS headers for actual responses ---
    const corsHeaders = buildCorsHeaders(request, env);
    const applyCors = (response: Response): Response => {
      if (!corsHeaders) return response;
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
      }
      return new Response(response.body, { status: response.status, headers });
    };

    // --- Routing ---
    try {
      // GET /api/health
      if (path === '/api/health' && method === 'GET') {
        return applyCors(await handleHealth(env.DB));
      }

      // POST /api/requests
      if (path === '/api/requests' && method === 'POST') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleCreateRequest(request, env.DB));
      }

      // GET /api/requests/:requestId
      const requestMatch = path.match(/^\/api\/requests\/([^/]+)$/);
      if (requestMatch && method === 'GET') {
        if (!env.DB) {
          return applyCors(error('INTERNAL_ERROR', 'Database is not configured', 500));
        }
        return applyCors(await handleGetRequestStatus(requestMatch[1], env.DB));
      }

      // Known path, wrong method
      if (
        (path === '/api/health' && method !== 'GET') ||
        (path === '/api/requests' && method !== 'POST') ||
        (requestMatch && method !== 'GET')
      ) {
        return applyCors(error('METHOD_NOT_ALLOWED', 'Method not allowed', 405));
      }

      // Unknown route
      return applyCors(error('NOT_FOUND', 'Route not found', 404));
    } catch (err) {
      console.error('Unhandled worker error:', err);
      return applyCors(error('INTERNAL_ERROR', 'Internal server error', 500));
    }
  },
};