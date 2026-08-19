import { error } from './api';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
let checks = 0;

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Best-effort per-isolate burst protection. Cloudflare supplies CF-Connecting-IP;
 * raw IP addresses are never persisted or logged. Durable account/email cooldowns
 * remain enforced by their authoritative D1 services.
 */
export async function enforceRateLimit(
  request: Request,
  scope: string,
  maximum: number,
  windowMs: number
): Promise<Response | null> {
  const address = request.headers.get('CF-Connecting-IP');
  if (!address) return null;
  const now = Date.now();
  const key = `${scope}:${await digest(`${scope}:${address}`)}`;
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1; buckets.set(key, bucket);

  if (++checks % 256 === 0) {
    for (const [candidate, value] of buckets) if (value.resetAt <= now) buckets.delete(candidate);
  }
  if (bucket.count <= maximum) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  const response = error('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
  response.headers.set('Retry-After', String(retryAfter));
  return response;
}

export function ratePolicy(path: string, method: string): [string, number, number] | null {
  if (method === 'POST' && path === '/api/auth/login') return ['admin-login', 8, 15 * 60_000];
  if (method === 'POST' && path === '/api/auth/bootstrap') return ['admin-bootstrap', 4, 15 * 60_000];
  if (method === 'POST' && path === '/api/customer-auth/start') return ['customer-login-start', 5, 15 * 60_000];
  if (method === 'POST' && path === '/api/customer-auth/verify') return ['customer-login-verify', 15, 15 * 60_000];
  if (method === 'POST' && path === '/api/purchases/recovery/request') return ['purchase-recovery', 5, 15 * 60_000];
  if (method === 'POST' && path === '/api/purchases/recovery/redeem') return ['purchase-recovery-redeem', 20, 15 * 60_000];
  if (method === 'POST' && path === '/api/requests') return ['public-request', 10, 10 * 60_000];
  if (method === 'POST' && path === '/api/orders') return ['order-create', 15, 10 * 60_000];
  if (method === 'POST' && /\/verify-payment$/.test(path)) return ['payment-verify', 30, 10 * 60_000];
  if (method === 'POST' && /\/qr$/.test(path)) return ['payment-qr', 15, 10 * 60_000];
  if (method === 'GET' && /\/download$/.test(path)) return ['download', 60, 60_000];
  if (method === 'POST' && path === '/api/analytics/events') return ['analytics', 120, 60_000];
  if (method === 'POST' && /\/affiliate-offers\/\d+\/click$/.test(path)) return ['affiliate-click', 60, 60_000];
  if (path.startsWith('/api/admin/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return ['admin-mutation', 120, 60_000];
  return null;
}
