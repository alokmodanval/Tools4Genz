/**
 * Order & Payment route handlers for Cloudflare Worker.
 *
 * Implements:
 * - POST /api/orders (Create order with authoritative price & Razorpay test order)
 * - POST /api/orders/:orderId/verify-payment (HMAC-SHA256 signature verification & status transition)
 * - GET /api/orders/:orderId (Safe public order status lookup)
 * - POST /api/orders/:orderId/payment/qr (Dynamic UPI QR with authoritative locked amount)
 * - GET /api/orders/:orderId/download (Secure digital delivery download, Phase 9)
 */

import {
  adminProjectRepository,
  D1Database,
  digitalDeliveryRepository,
  orderRepository,
} from '../db/repository';
import { findAuthoritativeProject } from '../data/projects';
import {
  loadDeliveryObject,
  prepareDelivery,
  buildDownloadFilename,
  resolveDeliverySource,
  StorageBindings,
} from '../services/delivery';
import { resolveAssetStorage } from '../services/assetStorage';
import { resolveProjectPurchaseAvailability } from '../services/purchaseAvailability';
import { currentCustomer, customerAuthEnabled } from '../services/customerAuth';
import { EmailBindings, ensurePurchaseReceipt } from '../services/email/transactionalEmail';
import { error, success } from '../utils/api';
import {
  createRazorpayOrder,
  createRazorpayQrCode,
  generateOrderId,
  verifyRazorpaySignature,
} from '../utils/payment';
import { BodyTooLargeError, readJsonBody } from '../utils/body';
import {
  generatePurchaseAccessToken,
  hashPurchaseAccessToken,
  verifyPurchaseAccessToken,
} from '../utils/purchaseAccess';

export interface EnvWithSecrets extends StorageBindings, EmailBindings {
  DB?: D1Database;
  ALLOWED_ORIGINS?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
  PURCHASE_AVAILABILITY_BYPASS?: string;
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
    body = (await readJsonBody(request)) as Record<string, unknown>;
  } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
    return error('VALIDATION_ERROR', 'Invalid JSON body', 400);
  }

  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
  const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
  let customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
  const customerPhone = typeof body.customerPhone === 'string' ? body.customerPhone.trim() : undefined;
  const notes = typeof body.notes === 'string' ? body.notes.trim() : undefined;

  const authenticatedCustomer = customerAuthEnabled(env) ? await currentCustomer(request, db) : null;
  if (customerAuthEnabled(env) && !authenticatedCustomer) {
    return error('CUSTOMER_AUTH_REQUIRED', 'Log in before starting a purchase.', 401);
  }
  if (authenticatedCustomer) customerEmail = authenticatedCustomer.email;

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

  const purchaseAvailability = await resolveProjectPurchaseAvailability(db, env, projectId);
  if (!purchaseAvailability.purchasable) {
    return error(
      'PROJECT_NOT_AVAILABLE',
      'This project is currently unavailable while its download file is being prepared.',
      409
    );
  }

  // 3. Generate unique order ID
  const orderId = generateOrderId();
  const now = new Date().toISOString();
  const accessToken = generatePurchaseAccessToken();
  const accessTokenHash = await hashPurchaseAccessToken(accessToken);

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
    access_token_hash: accessTokenHash,
    access_token_created_at: now,
  });
  if (authenticatedCustomer) {
    await db.prepare(`UPDATE orders SET customer_user_id = ? WHERE order_id = ?`).bind(authenticatedCustomer.id, orderId).run();
  }

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
      // Returned exactly once. Only its SHA-256 hash is stored in D1.
      accessToken,
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
 * GET /api/projects/:projectId/availability
 * Safe catalog availability used by project detail pages. D1 and private
 * storage remain authoritative; no internal release ID or object key is exposed.
 */
export async function handleGetProjectAvailability(
  projectId: string,
  db: D1Database,
  env: EnvWithSecrets
): Promise<Response> {
  const cleanProjectId = projectId.trim();
  if (!cleanProjectId) return error('VALIDATION_ERROR', 'Project ID is required', 400);

  const d1Project = await adminProjectRepository.getById(db, cleanProjectId);
  const catalogProject = findAuthoritativeProject(cleanProjectId);
  if (!d1Project && !catalogProject) return error('NOT_FOUND', 'Project not found', 404);

  const availability = await resolveProjectPurchaseAvailability(db, env, cleanProjectId);
  return success({
    projectId: cleanProjectId,
    purchasable: availability.purchasable,
    status: availability.status,
    message: availability.purchasable
      ? 'Project download is available for purchase.'
      : 'Project file is being prepared and cannot be purchased yet.',
  });
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
    body = (await readJsonBody(request)) as Record<string, unknown>;
  } catch (caught) {
    if (caught instanceof BodyTooLargeError) return error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413);
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
    // Phase 9: Ensure delivery exists for already-paid orders.
    try {
      await prepareDelivery(
        db,
        order.order_id,
        env
      );
    } catch {
      // Delivery preparation must never fail the payment verification response.
    }
    try {
      await ensurePurchaseReceipt(db, order.order_id, env);
    } catch (receiptError) {
      console.error(`[VerifyPayment] Receipt processing failed for order ${order.order_id}:`, receiptError);
    }

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

  // 6. Phase 9: Prepare digital delivery (idempotent) now that payment is confirmed.
  try {
    await prepareDelivery(
      db,
      order.order_id,
      env
    );
  } catch (deliveryErr) {
    console.error(
      `[VerifyPayment] Delivery preparation failed for order ${order.order_id}:`,
      deliveryErr
    );
  }
  try {
    await ensurePurchaseReceipt(db, order.order_id, env);
  } catch (receiptError) {
    console.error(`[VerifyPayment] Receipt processing failed for order ${order.order_id}:`, receiptError);
  }

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
export async function handleGetOrderById(
  request: Request,
  orderId: string,
  db: D1Database,
  env?: EnvWithSecrets
): Promise<Response> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    return error('VALIDATION_ERROR', 'Order ID is required', 400);
  }

  const internalOrder = await orderRepository.findByOrderId(db, cleanId);
  if (!internalOrder) {
    return error('NOT_FOUND', 'Order not found', 404);
  }
  const accessError = await verifyPurchaseAccessToken(request, internalOrder);
  if (accessError) return accessError;

  let order = await orderRepository.findPublicOrder(db, cleanId);
  if (!order) return error('NOT_FOUND', 'Order not found', 404);

  // Once private storage is configured, polling this safe public status endpoint also
  // promotes a pending delivery to ready after its artifact is uploaded.
  if (order.status === 'paid' && (env?.PROJECT_ASSETS || env?.DIGITAL_DELIVERY_BUCKET)) {
    await prepareDelivery(db, order.order_id, env);
    order = (await orderRepository.findPublicOrder(db, cleanId)) || order;
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
    paidAt: order.paid_at,
    createdAt: order.created_at,
    deliveryStatus: order.delivery_status || null,
  });
}

/**
 * GET /api/orders/:orderId/download
 * Secure digital delivery download endpoint (Phase 9).
 *
 * Security Requirements:
 *  - Only GET.
 *  - Order must be 'paid'.
 *  - Delivery must exist and be 'ready'.
 *  - R2 object key is ALWAYS resolved server-side from D1.
 *  - Frontend never supplies an object key.
 *  - R2 bucket stays private.
 */
export async function handleDownloadDelivery(
  request: Request,
  orderId: string,
  db: D1Database,
  env: EnvWithSecrets
): Promise<Response> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    return error('VALIDATION_ERROR', 'Order ID is required', 400);
  }

  // 1. Lookup order (authoritative, server-side)
  const order = await orderRepository.findByOrderId(db, cleanId);
  if (!order) {
    return error('NOT_FOUND', 'Order not found', 404);
  }

  const accessError = await verifyPurchaseAccessToken(request, order);
  if (accessError) return accessError;

  // 2. Require paid status
  if (order.status !== 'paid') {
    if (order.status === 'cancelled' || order.status === 'refunded') {
      return error(
        'INVALID_STATE',
        `Order is ${order.status} and is not eligible for download.`,
        400
      );
    }
    return error(
      'PAYMENT_REQUIRED',
      'This order has not been paid yet. Complete the payment to access your download.',
      402
    );
  }

  // Recheck R2 so a file uploaded after payment can become downloadable
  // without requiring another payment webhook.
  await prepareDelivery(db, order.order_id, env);

  // 3. Lookup delivery record
  const delivery = await digitalDeliveryRepository.findByOrderId(db, cleanId);
  if (!delivery) {
    return error('DELIVERY_NOT_FOUND', 'Digital delivery has not been prepared for this order yet.', 404);
  }

  // 4. Require ready status — never pretend a file exists.
  if (delivery.delivery_status !== 'ready') {
    if (delivery.delivery_status === 'failed') {
      return error(
        'DELIVERY_PROVIDER_ERROR',
        'The delivery provider could not be reached. Please try again later.',
        503
      );
    }
    return error(
      'DELIVERY_NOT_READY',
      'Your project is still being prepared. Please check back shortly.',
      409
    );
  }

  // 5. Resolve through the trusted release record. Legacy deliveries retain
  // their immutable Phase 9 key.
  const deliverySource = await resolveDeliverySource(db, delivery);
  if (!deliverySource) {
    return error(
      'DELIVERY_NOT_READY',
      'The project release is not available. Please check back shortly.',
      409
    );
  }
  const object = await loadDeliveryObject(
    resolveAssetStorage(env, deliverySource.provider),
    deliverySource.key
  );
  if (!object || !object.body) {
    // The artifact was marked ready but is now missing — reset to pending.
    await digitalDeliveryRepository.update(db, delivery.id, {
      delivery_status: 'pending',
      file_size: null,
      sha256: null,
    });
    await orderRepository.linkDelivery(db, cleanId, delivery.id, 'pending');
    return error(
      'DELIVERY_NOT_READY',
      'The project file could not be located. Please check back shortly.',
      409
    );
  }

  // 6. Increment download count safely (server-side, atomic).
  await digitalDeliveryRepository.incrementDownloadCount(db, delivery.id);

  // 7. Stream the file back to the customer.
  const filename = buildDownloadFilename(order.project_id, order.project_title);
  return new Response(object.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      'Content-Length': String(object.size),
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

/**
 * POST /api/orders/:orderId/payment/qr
 * Generates or retrieves a single-use Dynamic UPI QR code with authoritative order amount.
 */
export async function handleCreateOrderQr(
  request: Request,
  orderId: string,
  db: D1Database,
  env: EnvWithSecrets
): Promise<Response> {
  const cleanId = orderId.trim();
  if (!cleanId) {
    return error('VALIDATION_ERROR', 'Order ID is required', 400);
  }

  // 1. Fetch internal order from D1
  const order = await orderRepository.findByOrderId(db, cleanId);
  if (!order) {
    return error('NOT_FOUND', 'Order not found', 404);
  }

  // 2. State Validations
  if (order.status === 'paid') {
    return error('ALREADY_PAID', 'This order has already been paid.', 400);
  }
  if (order.status === 'cancelled' || order.status === 'refunded') {
    return error('INVALID_STATE', `Order is ${order.status} and cannot be paid.`, 400);
  }

  // 3. Idempotency / Active QR check
  const nowUnix = Math.floor(Date.now() / 1000);
  if (order.qr_id && order.qr_image_url && order.qr_close_by && order.qr_close_by > nowUnix) {
    return success({
      orderId: order.order_id,
      qrId: order.qr_id,
      imageUrl: order.qr_image_url,
      amount: order.amount,
      currency: order.currency,
      expiresAt: new Date(order.qr_close_by * 1000).toISOString(),
    });
  }

  // 4. Server-Authoritative Price & Expiry
  const authoritativeAmount = order.amount;
  const currency = order.currency || 'INR';
  const expiryMinutes = 15;
  const closeBy = nowUnix + expiryMinutes * 60;

  // 5. Razorpay QR Creation
  const rzpKeyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  const isRealMerchantKey =
    keySecret &&
    rzpKeyId &&
    !rzpKeyId.includes('placeholder') &&
    !rzpKeyId.includes('simulat') &&
    !rzpKeyId.includes('public_key');

  let qrId = `qr_sim_${cleanId.replace('TG-ORD-', '')}`;
  let imageUrl = `https://rzp.io/i/sim_${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  if (isRealMerchantKey && rzpKeyId && keySecret) {
    try {
      const qrRes = await createRazorpayQrCode(
        {
          orderId: cleanId,
          projectId: order.project_id,
          amount: authoritativeAmount,
          currency,
          description: `Tools4Genz - ${order.project_title}`,
          expiryMinutes,
        },
        rzpKeyId,
        keySecret
      );
      qrId = qrRes.id;
      imageUrl = qrRes.imageUrl;
    } catch (rzpErr: unknown) {
      const errMsg = rzpErr instanceof Error ? rzpErr.message : String(rzpErr);
      console.error('Failed to create Razorpay QR code:', errMsg);
      if (
        errMsg.includes('qr_codes') ||
        errMsg.includes('not enabled') ||
        errMsg.includes('BAD_REQUEST_ERROR')
      ) {
        return error(
          'FEATURE_NOT_ENABLED',
          'Razorpay Dynamic UPI QR is not enabled on this merchant account. Please contact Razorpay Support to activate QR codes or use Razorpay Checkout.',
          400
        );
      }
      return error('PAYMENT_ERROR', 'Failed to generate Dynamic UPI QR. Please try Razorpay Checkout.', 502);
    }
  }

  // 6. Store QR details in D1
  await orderRepository.updateQrDetails(db, cleanId, {
    qrId,
    imageUrl,
    status: 'active',
    closeBy,
  });

  return success(
    {
      orderId: cleanId,
      qrId,
      imageUrl,
      amount: authoritativeAmount,
      currency,
      expiresAt: new Date(closeBy * 1000).toISOString(),
    },
    201
  );
}
