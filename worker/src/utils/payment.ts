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
  } catch {
    console.error('Payment signature verification could not complete');
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
    console.error('Razorpay order creation failed with provider status', response.status);
    throw new Error(`Razorpay API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as RazorpayOrderResponse;
  return {
    id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

/**
 * Razorpay QR Codes API response structure.
 */
export interface RazorpayQrCodeResponse {
  id: string; // e.g. qr_HMs15hP0i0r21e
  entity: string;
  name: string;
  usage: string; // single_use
  type: string; // upi_qr
  image_url: string;
  payment_amount: number; // in paise
  status: string; // active | closed
  description?: string;
  fixed_amount: boolean;
  close_by?: number;
  notes?: Record<string, string>;
}

/**
 * Create a Dynamic Single-Use Fixed-Amount UPI QR code via Razorpay REST API.
 * POST https://api.razorpay.com/v1/payments/qr_codes
 */
export async function createRazorpayQrCode(
  params: {
    orderId: string;
    projectId: string;
    amount: number; // in INR
    currency?: string;
    description?: string;
    expiryMinutes?: number;
  },
  keyId: string,
  keySecret: string
): Promise<{
  id: string;
  imageUrl: string;
  paymentAmount: number;
  amount: number;
  currency: string;
  status: string;
  closeBy: number;
}> {
  const amountInPaise = Math.round(params.amount * 100);
  const currency = params.currency || 'INR';
  const expiryMins = params.expiryMinutes || 15;
  const closeBy = Math.floor(Date.now() / 1000) + expiryMins * 60;

  const authHeader = `Basic ${btoa(`${keyId}:${keySecret}`)}`;

  const body = {
    type: 'upi_qr',
    name: `Tools4Genz Order ${params.orderId}`,
    usage: 'single_use',
    fixed_amount: true,
    payment_amount: amountInPaise,
    description: params.description || `Tools4Genz Project Purchase ${params.orderId}`,
    close_by: closeBy,
    notes: {
      order_id: params.orderId,
      project_id: params.projectId,
    },
  };

  const response = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Razorpay QR creation failed with provider status', response.status);
    throw new Error(`Razorpay QR API error (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as RazorpayQrCodeResponse;
  return {
    id: data.id,
    imageUrl: data.image_url,
    paymentAmount: data.payment_amount,
    amount: params.amount,
    currency,
    status: data.status,
    closeBy,
  };
}

/**
 * Verify Razorpay Webhook signature using HMAC-SHA256.
 *
 * According to Razorpay documentation:
 * signature = HMAC-SHA256(raw_request_body, webhook_secret)
 */
export async function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): Promise<boolean> {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const msgData = encoder.encode(rawBody);

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
  } catch {
    console.error('Webhook signature verification could not complete');
    return false;
  }
}

/**
 * Compute SHA-256 hash of a string.
 */
export async function computeSha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
