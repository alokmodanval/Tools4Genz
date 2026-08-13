import { D1Database } from '../db/repository';
import { success } from '../utils/api';

/**
 * GET /api/health
 * Simple liveness check. Does not expose DB credentials, secrets, or internals.
 * Optionally verifies the D1 binding exists (without querying user data).
 */
export async function handleHealth(db: D1Database | undefined): Promise<Response> {
  return success({
    service: 'tools4genz-api',
    status: 'ok',
    database: db ? 'configured' : 'not-configured',
  });
}