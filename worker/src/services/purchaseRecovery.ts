import {
  D1Database,
  orderRepository,
  purchaseRecoveryRepository,
  transactionalEmailRepository,
} from '../db/repository';
import { generatePurchaseAccessToken, hashPurchaseAccessToken } from '../utils/purchaseAccess';
import { EmailBindings } from './email/emailProvider';
import { resolveEmailProvider } from './email/transactionalEmail';
import { buildRecoveryEmail } from './email/templates';

const RECOVERY_TOKEN_PATTERN = /^rt_[A-Za-z0-9_-]{43}$/;
const RECOVERY_TTL_MS = 30 * 60 * 1000;
const RECOVERY_COOLDOWN_MS = 60 * 1000;
const RECOVERY_WINDOW_MS = 60 * 60 * 1000;
const RECOVERY_WINDOW_LIMIT = 3;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function randomBase64Url(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function generateRecoveryToken(): string {
  return `rt_${randomBase64Url(32)}`;
}

function generateRecoveryRequestId(): string {
  return `recreq_${randomBase64Url(18)}`;
}

export function normalizeRecoveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function hashRecoveryValue(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface RecoveryRequestResult {
  accepted: true;
  limited: boolean;
  matchedOrders: number;
  emailStatus: 'sent' | 'failed' | 'skipped';
}

export async function requestPurchaseRecovery(
  db: D1Database,
  rawEmail: string,
  bindings: EmailBindings
): Promise<RecoveryRequestResult> {
  const email = normalizeRecoveryEmail(rawEmail);
  if (!EMAIL_REGEX.test(email)) {
    return { accepted: true, limited: false, matchedOrders: 0, emailStatus: 'skipped' };
  }

  const nowDate = new Date();
  const now = nowDate.toISOString();
  const emailHash = await hashRecoveryValue(email);
  const latest = await purchaseRecoveryRepository.findLatestRequest(db, emailHash);
  const recentCount = await purchaseRecoveryRepository.countRecentRequests(
    db,
    emailHash,
    new Date(nowDate.getTime() - RECOVERY_WINDOW_MS).toISOString()
  );
  const inCooldown = latest
    ? nowDate.getTime() - new Date(latest.created_at).getTime() < RECOVERY_COOLDOWN_MS
    : false;
  if (inCooldown || recentCount >= RECOVERY_WINDOW_LIMIT) {
    return { accepted: true, limited: true, matchedOrders: 0, emailStatus: 'skipped' };
  }

  const requestId = generateRecoveryRequestId();
  await purchaseRecoveryRepository.createRequest(db, {
    request_id: requestId,
    email_hash: emailHash,
    status: 'accepted',
    created_at: now,
    updated_at: now,
  });

  const orders = await orderRepository.findPaidByNormalizedEmail(db, email);
  const provider = resolveEmailProvider(bindings);
  if (orders.length === 0 || !provider) {
    await purchaseRecoveryRepository.updateRequestStatus(
      db,
      requestId,
      orders.length === 0 ? 'no_matching_purchases' : 'email_failed'
    );
    return {
      accepted: true,
      limited: false,
      matchedOrders: orders.length,
      emailStatus: orders.length === 0 ? 'skipped' : 'failed',
    };
  }

  const expiresAt = new Date(nowDate.getTime() + RECOVERY_TTL_MS).toISOString();
  const actions: Array<{ order: typeof orders[number]; recoveryToken: string }> = [];
  for (const order of orders) {
    const recoveryToken = generateRecoveryToken();
    await purchaseRecoveryRepository.createToken(db, {
      request_id: requestId,
      order_id: order.order_id,
      token_hash: await hashRecoveryValue(recoveryToken),
      expires_at: expiresAt,
      used_at: null,
      revoked_at: null,
      created_at: now,
    });
    actions.push({ order, recoveryToken });
  }

  const dedupeKey = `recovery:${requestId}`;
  await transactionalEmailRepository.createProcessing(db, {
    orderId: null,
    emailType: 'recovery',
    dedupeKey,
    provider: provider.name,
  });
  try {
    const emailContent = buildRecoveryEmail(actions, bindings.SITE_URL || 'https://tools4genz.com');
    const sent = await provider.send({
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      idempotencyKey: dedupeKey,
    });
    await transactionalEmailRepository.markSent(db, dedupeKey, sent.messageId);
    await purchaseRecoveryRepository.updateRequestStatus(db, requestId, 'email_sent');
    return { accepted: true, limited: false, matchedOrders: orders.length, emailStatus: 'sent' };
  } catch (sendError) {
    const safeError = sendError instanceof Error ? sendError.message : 'Email provider request failed';
    await transactionalEmailRepository.markFailed(db, dedupeKey, safeError);
    await purchaseRecoveryRepository.revokeRequestTokens(db, requestId);
    await purchaseRecoveryRepository.updateRequestStatus(db, requestId, 'email_failed');
    return { accepted: true, limited: false, matchedOrders: orders.length, emailStatus: 'failed' };
  }
}

export type RecoveryRedeemResult =
  | { ok: true; orderId: string; accessToken: string; projectId: string; projectTitle: string; createdAt: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

export async function redeemPurchaseRecovery(
  db: D1Database,
  recoveryToken: string
): Promise<RecoveryRedeemResult> {
  if (!RECOVERY_TOKEN_PATTERN.test(recoveryToken)) return { ok: false, reason: 'invalid' };
  const tokenHash = await hashRecoveryValue(recoveryToken);
  const token = await purchaseRecoveryRepository.findTokenByHash(db, tokenHash);
  if (!token || token.revoked_at) return { ok: false, reason: 'invalid' };
  if (token.used_at) return { ok: false, reason: 'used' };

  const now = new Date().toISOString();
  if (token.expires_at <= now) return { ok: false, reason: 'expired' };
  const claimed = await purchaseRecoveryRepository.claimToken(db, token.id, now);
  if (!claimed) return { ok: false, reason: 'used' };

  const order = await orderRepository.findByOrderId(db, token.order_id);
  if (!order || order.status !== 'paid') return { ok: false, reason: 'invalid' };

  const accessToken = generatePurchaseAccessToken();
  const rotated = await orderRepository.rotateAccessToken(
    db,
    order.order_id,
    await hashPurchaseAccessToken(accessToken),
    now
  );
  if (!rotated) return { ok: false, reason: 'invalid' };

  return {
    ok: true,
    orderId: order.order_id,
    accessToken,
    projectId: order.project_id,
    projectTitle: order.project_title,
    createdAt: order.created_at,
  };
}

