import { D1Database } from '../db/repository';
import { EmailBindings } from './email/emailProvider';
import { resolveEmailProvider } from './email/transactionalEmail';

const COOKIE = 't4g_customer_session';
const encoder = new TextEncoder();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomUrlToken(bytesLength = 32): string {
  const bytes = new Uint8Array(bytesLength); crypto.getRandomValues(bytes);
  let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function constantTimeEqual(a: string, b: string) {
  let diff = a.length ^ b.length; const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
export function customerAuthEnabled(env: EmailBindings): boolean {
  return Boolean(env.EMAIL_PROVIDER || (env.RESEND_API_KEY && env.EMAIL_FROM));
}
function cookieValue(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const value = cookies.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1) || '';
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
}
export async function currentCustomer(request: Request, db: D1Database) {
  const token = cookieValue(request); if (!token) return null;
  const row = await db.prepare(
    `SELECT u.id, u.email_normalized email, u.display_name displayName, u.status
     FROM customer_sessions s JOIN customer_users u ON u.id = s.user_id
     WHERE s.session_token_hash = ? AND s.expires_at > ? AND s.revoked_at IS NULL AND u.status = 'active' LIMIT 1`
  ).bind(await hash(token), new Date().toISOString()).first<{ id: number; email: string; displayName: string | null; status: string }>();
  if (row) await db.prepare(`UPDATE customer_sessions SET last_seen_at = ? WHERE session_token_hash = ?`).bind(new Date().toISOString(), await hash(token)).run();
  return row;
}
export async function createLoginChallenge(db: D1Database, rawEmail: string, env: EmailBindings): Promise<'sent' | 'disabled' | 'invalid'> {
  if (!customerAuthEnabled(env)) return 'disabled';
  const email = rawEmail.trim().toLowerCase(); if (!emailPattern.test(email)) return 'invalid';
  const provider = resolveEmailProvider(env); if (!provider) return 'disabled';
  const random = new Uint32Array(1); crypto.getRandomValues(random); const code = String(100000 + (random[0] % 900000));
  const now = new Date();
  await db.prepare(`INSERT INTO customer_login_challenges(email_normalized, code_hash, expires_at, used_at, attempt_count, created_at) VALUES (?, ?, ?, NULL, 0, ?)`)
    .bind(email, await hash(`${email}:${code}`), new Date(now.getTime() + 10 * 60000).toISOString(), now.toISOString()).run();
  await provider.send({ to: email, subject: 'Your Tools4Genz login code', text: `Your Tools4Genz login code is ${code}. It expires in 10 minutes.`, html: `<p>Your Tools4Genz login code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`, idempotencyKey: `customer-login:${email}:${now.toISOString()}` });
  return 'sent';
}
export async function verifyLoginChallenge(db: D1Database, rawEmail: string, code: string) {
  const email = rawEmail.trim().toLowerCase();
  const challenge = await db.prepare(`SELECT * FROM customer_login_challenges WHERE email_normalized = ? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`)
    .bind(email).first<{ id: number; code_hash: string; expires_at: string; attempt_count: number }>();
  if (!challenge || challenge.attempt_count >= 5) return { ok: false as const, reason: 'invalid' };
  if (challenge.expires_at <= new Date().toISOString()) return { ok: false as const, reason: 'expired' };
  const matches = constantTimeEqual(await hash(`${email}:${code}`), challenge.code_hash);
  if (!matches) { await db.prepare(`UPDATE customer_login_challenges SET attempt_count = attempt_count + 1 WHERE id = ?`).bind(challenge.id).run(); return { ok: false as const, reason: 'invalid' }; }
  const now = new Date().toISOString();
  const consumed = await db.prepare(`UPDATE customer_login_challenges SET used_at = ? WHERE id = ? AND used_at IS NULL`).bind(now, challenge.id).run();
  if (!consumed.meta.changes) return { ok: false as const, reason: 'invalid' };
  await db.prepare(`INSERT INTO customer_users(email_normalized, status, created_at, updated_at, last_login_at) VALUES (?, 'active', ?, ?, ?)
    ON CONFLICT(email_normalized) DO UPDATE SET last_login_at = excluded.last_login_at, updated_at = excluded.updated_at`).bind(email, now, now, now).run();
  const user = await db.prepare(`SELECT id, email_normalized email, display_name displayName, status FROM customer_users WHERE email_normalized = ?`).bind(email).first<{ id: number; email: string; displayName: string | null; status: string }>();
  if (!user) return { ok: false as const, reason: 'invalid' };
  const token = randomUrlToken(); await db.prepare(`INSERT INTO customer_sessions(user_id, session_token_hash, expires_at, created_at, last_seen_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)`)
    .bind(user.id, await hash(token), new Date(Date.now() + 30 * 86400000).toISOString(), now, now).run();
  return { ok: true as const, user, token };
}
export function customerSessionCookie(token: string) { return `${COOKIE}=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=2592000`; }
export function clearCustomerSessionCookie() { return `${COOKIE}=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`; }
export async function revokeCustomerSession(request: Request, db: D1Database) {
  const token = cookieValue(request); if (token) await db.prepare(`UPDATE customer_sessions SET revoked_at = ? WHERE session_token_hash = ?`).bind(new Date().toISOString(), await hash(token)).run();
}
