/**
 * Order & Payment route handlers for Cloudflare Worker.
 *
 * Implements:
 * - POST /api/orders (Create order with authoritative price & Razorpay test order)
 * - POST /api/orders/:orderId/verify-payment (HMAC-SHA256 signature verification & status transition)
 * - GET /api/orders/:orderId (Safe public order status lookup)
 */

import { adminProjectRepository, D1Database, orderRepository } from '../db/repository';
import { findAuthoritativeProject } from '../data/projects';
import { error, success } from '../utils/api';
import { createRazorpayOrder, generateOrderId, verifyRazorpaySignature } from '../utils/payment';

export interface EnvWithSecrets {
  DB?: D1Database;
  ALLOWED_ORIGINS?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/orders
 * Creates an internal order and links a Razorpay Test Order.
 */
export async function handleCreateOrder(
  request: Request,
  db: D1Database,
  env: EnvWithSecrets
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
  const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : undefined;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

  // 1. Validation
  if (!projectId) {
    return error('VALIDATION_ERROR', 'Project ID is required', 400);
  }
  if (!customerName || customerName.length < 2) {
    return error('VALIDATION_ERROR', 'Customer name must be at least 2 characters', 400);
  }
  if (!customerEmail || !EMAIL_REGEX.test(customerEmail)) {
    return error('VALIDATION_ERROR', 'Valid customer email is required', 400);
  }

  // 2. Authoritative Price Resolution
  // Check D1 admin_projects table first, then fallback to authoritative catalog
  let projectTitle = '';
  let projectSlug = '';
  let price = 0;
  let currency = 'INR';
  let isAvailable = false;

  const d1Project = await adminProjectRepository.getById(db, projectId);
  if (d1Project) {
    try {
      const parsedData = JSON.parse(d1Project.data);
      projectTitle = d1Project.title || parsedData.title || projectId;
      projectSlug = d1Project.slug || parsedData.slug || projectId;
      price = typeof parsedData.price === 'number' ? parsedData.price : 0;
      currency = parsedData.currency || 'INR';
      isAvailable = d1Project.status === 'available' || parsedData.status === 'available';
    } catch {
      // ignore parse error and fallback
    }
  }

  if (!price) {
    const catalogProject = findAuthoritativeProject(projectId);
    if (catalogProject) {
      projectTitle = catalogProject.title;
      projectSlug = catalogProject.slug;
      price = catalogProject.price;
      currency = catalogProject.currency;
      isAvailable = catalogProject.status === 'available';
    }
  }

  if (!price || !isAvailable) {
    return error('NOT_FOUND', 'Project not found or not available for purchase', 404);
  }

  // 3. Generate unique order ID
  const orderId = generateOrderId();
  const now = new Date().toISOString();

  // 4. Create internal D1 order record
  await orderRepository.create(db, {
    order_id: orderId,
    project_id: projectId,
    project_slug: projectSlug,
    project_title: projectTitle,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_phone: customerPhone || null,
    amount: price,
    currency,
    status: 'created',
    payment_provider: 'razorpay',
    provider_order_id: null,
    provider_payment_id: null,
    provider_signature: null,
    notes: notes || null,
    paid_at: null,
    created_at: now,
    updated_at: now,
  });

  // 5. Create Razorpay Test Order
  const keyId = env.RAZORPAY_KEY_ID || 'rzp_test_placeholder';
  const keySecret = env.RAZORPAY_KEY_SECRET;
  let providerOrderId = `order_test_${orderId.replace('TG-ORD-', '')}`;

  // Only invoke live Razorpay REST API if real merchant test credentials are provided
  const rzpKeyId = env.RAZORPAY_KEY_ID;
  const isRealMerchantKey =
    keySecret &&
    rzpKeyId &&
    !rzpKeyId.includes('placeholder') &&
    !rzpKeyId.includes('simulat') &&
    !rzpKeyId.includes('public_key');

  if (isRealMerchantKey && rzpKeyId && keySecret) {
    try {
      const rzpOrder = await createRazorpayOrder(
        {
          amount: price,
          currency,
          receipt: orderId,
          notes: {
            projectId,
            projectSlug,
            customerEmail,
          },
        },
        rzpKeyId,
        keySecret
      );
      providerOrderId = rzpOrder.id;
    } catch (rzpErr) {
      console.error('Failed to create Razorpay order:', rzpErr);
      await orderRepository.updateStatus(db, orderId, 'payment_failed', 'Razorpay API creation error');
      return error('PAYMENT_ERROR', 'Failed to initialize payment with provider. Please try again.', 502);
    }
  }

  // 6. Update order with provider order ID and transition to payment_pending
  await orderRepository.updateProviderOrderId(db, orderId, providerOrderId, 'payment_pending');

  return success(
    {
      orderId,
      providerOrderId,
      amount: price,
      currency,
      keyId,
      project: {
        id: projectId,
        slug: projectSlug,
        title: projectTitle,
      },
      customer: {
        name: customerName,
        email: customerEmail,
      },
    },
    201
  );
}

/**
 * POST /api/orders/:orderId/verify-payment
 * Verifies Razorpay checkout signature and transitions order to paid.
 */
export async function handleVerifyPayment(
  request: Request,
  orderId: string,
  db: D1Database,
  env: EnvWithSecrets
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return error('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const razorpayOrderId = typeof body.razorpay_order_id === 'string' ? body.razorpay_order_id.trim() : '';
  const razorpayPaymentId = typeof body.razorpay_payment_id === 'string' ? body.razorpay_payment_id.trim() : '';
  const razorpaySignature = typeof body.razorpay_signature === 'string' ? body.razorpay_signature.trim() : '';

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return error('VALIDATION_ERROR', 'Missing payment verification credentials', 400);
  }

  // 1. Fetch internal order
  const order = await orderRepository.findByOrderId(db, orderId);
  if (!order) {
    return error('NOT_FOUND', 'Order not found', 404);
  }

  // 2. Idempotency Check: if already paid with same payment ID, return current paid state safely
  if (order.status === 'paid') {
    return success({
      orderId: order.order_id,
      status: 'paid',
      providerPaymentId: order.provider_payment_id || razorpayPaymentId,
      paidAt: order.paid_at || order.updated_at,
      amount: order.amount,
      currency: order.currency,
      projectTitle: order.project_title,
    });
  }

  // 3. Confirm provider order ID matches internal order record
  if (order.provider_order_id && order.provider_order_id !== razorpayOrderId) {
    return error('VALIDATION_ERROR', 'Provider order ID mismatch', 400);
  }

  // 4. Server-Side HMAC-SHA256 Signature Verification
  const keySecret = env.RAZORPAY_KEY_SECRET || 'test_secret_for_local_simulation';
  const isValidSignature = await verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    keySecret
  );

  if (!isValidSignature) {
    console.warn(`Payment signature verification failed for order ${orderId}`);
    await orderRepository.updateStatus(db, orderId, 'payment_failed', 'Invalid payment signature');
    return error('INVALID_SIGNATURE', 'Payment signature verification failed. Untrusted payment.', 400);
  }

  // 5. Transition internal order to 'paid'
  const now = new Date().toISOString();
  await orderRepository.markPaid(db, orderId, razorpayPaymentId, razorpaySignature);

  return success({
    orderId: order.order_id,
    status: 'paid',
    providerPaymentId: razorpayPaymentId,
    paidAt: now,
    amount: order.amount,
    currency: order.currency,
    projectTitle: order.project_title,
  });
}

/**
 * GET /api/orders/:orderId
 * Safe public order lookup (does not expose sensitive customer PII or API secrets).
 */
export async function handleGetOrderById(orderId: string, db: D1Database): Promise<Response> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    return error('VALIDATION_ERROR', 'Order ID is required', 400);
  }

  const order = await orderRepository.findPublicOrder(db, cleanId);
  if (!order) {
    return error('NOT_FOUND', 'Order not found', 404);
  }

  return success({
    orderId: order.order_id,
    projectId: order.project_id,
    projectSlug: order.project_slug,
    projectTitle: order.project_title,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    paymentProvider: order.payment_provider,
    providerPaymentId: order.provider_payment_id,
    paidAt: order.paid_at,
    createdAt: order.created_at,
  });
}
