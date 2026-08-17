/**
 * Server-side authentication and session verification middleware for Cloudflare Workers.
 *
 * Verifies the HttpOnly session cookie against the D1 admin_sessions + admin_users tables.
 * Never trusts client assertions; all authorization is strictly server-enforced.
 */

import { adminSessionRepository, D1Database } from '../db/repository';
import { error } from './api';

export interface AdminSession {
  userId: number;
  email: string;
  role: string;
  status: string;
}

/**
 * Extract session token from Cookie header (or fallback to Authorization header).
 */
export function extractSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  // Support both 'session_token' and 't4g_admin_session' cookie names
  const match =
    cookieHeader.match(/session_token=([^;]+)/) ||
    cookieHeader.match(/t4g_admin_session=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1].trim());
  }

  // Backup support for Authorization: Bearer <token>
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Validate session token against D1 and return the admin user details.
 * Also refreshes `last_seen_at` on active session access.
 */
export async function verifySession(
  request: Request,
  db: D1Database
): Promise<AdminSession | null> {
  const token = extractSessionToken(request);
  if (!token) {
    return null;
  }

  const session = await adminSessionRepository.findValidSession(db, token);
  if (!session || session.user_status !== 'active') {
    return null;
  }

  // Refresh last_seen_at asynchronously (sliding activity window)
  await adminSessionRepository.updateLastSeen(db, session.id);

  return {
    userId: session.admin_user_id,
    email: session.email,
    role: session.role,
    status: session.user_status,
  };
}

/**
 * Require valid admin authentication.
 * Returns either the verified AdminSession, or an immediate 401 Response.
 */
export async function requireAuth(
  request: Request,
  db: D1Database
): Promise<AdminSession | Response> {
  const session = await verifySession(request, db);
  if (!session) {
    return error('UNAUTHORIZED', 'Authentication required. Please log in.', 401);
  }
  return session;
}
