/**
 * Payment & Razorpay utilities for Cloudflare Worker.
 *
 * Uses native Web Crypto APIs for constant-time HMAC-SHA256 signature verification.
 */

import { constantTimeEqual } from './password';

/**
 * Generate a clean, unique Tools4Genz public order ID (e.g. TG-ORD-8F4C2A10).
 */
export function generateOrderId(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  return `TG-ORD-${hex}`;
}

/**
 * Verify Razorpay Checkout payment signature using HMAC-SHA256.
 *
 * According to Razorpay documentation:
 * signature = HMAC-SHA256(order_id + "|" + razorpay_payment_id, secret)
 */
export async function verifyRazorpaySignature(
  providerOrderId: string,
  providerPaymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!providerOrderId || !providerPaymentId || !signature || !secret) {
    return false;
  }

  try {
    const data = `${providerOrderId}|${providerPaymentId}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const generatedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase();

    return constantTimeEqual(generatedHex, signature.toLowerCase().trim());
  } catch (err) {
    console.error('Signature verification error:', err);
    return false;
  }
}

/**
 * Razorpay Orders API response structure.
 */
export interface RazorpayOrderResponse {
  id: string; // e.g. order_EKwxwAgItmmXdp
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

/**
 * Create an order with Razorpay Test Mode via REST API.
 */
export async function createRazorpayOrder(
  params: {
    amount: number; // in INR
    currency?: string;
    receipt: string; // internal order ID (TG-ORD-...)
    notes?: Record<string, string>;
  },
  keyId: string,
  keySecret: string
): Promise<{ id: string; amount: number; currency: string }> {
  // Amount in currency sub-units (paise: ₹4999 -> 499900 paise)
  const amountInPaise = Math.round(params.amount * 100);
  const currency = params.currency || 'INR';

  // Basic auth header
  const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;

  const body = {
    amount: amountInPaise,
    currency,
    receipt: params.receipt,
    notes: params.notes || {},
  };

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Razorpay Order creation failed:', response.status, errorBody);
    throw new Error(`Razorpay API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as RazorpayOrderResponse;
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}
