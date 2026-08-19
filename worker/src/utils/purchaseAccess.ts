import { OrderRow } from '../db/schema';
import { error } from './api';

const TOKEN_PREFIX = 'pt_';
const TOKEN_BYTES = 32;
const TOKEN_PATTERN = /^pt_[A-Za-z0-9_-]{43}$/;
const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function generatePurchaseAccessToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return `${TOKEN_PREFIX}${bytesToBase64Url(bytes)}`;
}

export async function hashPurchaseAccessToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function extractPurchaseAccessToken(request: Request): string | null {
  const authorization = request.headers.get('Authorization') || '';
  const match = authorization.match(/^Purchase\s+(.+)$/i);
  const token = match?.[1]?.trim() || '';
  return TOKEN_PATTERN.test(token) ? token : null;
}

function constantTimeEqual(left: string, right: string): boolean {
  const maxLength = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < maxLength; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export async function verifyPurchaseAccessToken(
  request: Request,
  order: OrderRow
): Promise<Response | null> {
  if (!order.access_token_hash) {
    return error(
      'PURCHASE_ACCESS_UNAVAILABLE',
      'Secure access is not configured for this legacy order. Contact support for recovery.',
      403
    );
  }

  const token = extractPurchaseAccessToken(request);
  if (!token) {
    return error('PURCHASE_ACCESS_REQUIRED', 'A valid purchase access token is required.', 401);
  }

  const suppliedHash = await hashPurchaseAccessToken(token);
  if (!constantTimeEqual(suppliedHash, order.access_token_hash)) {
    return error('PURCHASE_ACCESS_DENIED', 'Purchase access could not be verified.', 403);
  }
  return null;
}

