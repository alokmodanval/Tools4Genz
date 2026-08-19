/**
 * Razorpay Webhook & Payment Reconciliation Handler
 *
 * Implements server-to-server webhook signature verification,
 * event ledger recording, idempotency/deduplication, and authoritative order reconciliation.
 */

import { D1Database, orderRepository, paymentWebhookRepository } from '../db/repository';
import { Env } from '../index';
import { prepareDelivery } from '../services/delivery';
import { ensurePurchaseReceipt } from '../services/email/transactionalEmail';
import { error, success } from '../utils/api';
import { computeSha256, verifyRazorpayWebhookSignature } from '../utils/payment';
import { BodyTooLargeError, readTextBody } from '../utils/body';

export async function handleRazorpayWebhook(
  request: Request,
  db: D1Database,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return error('METHOD_NOT_ALLOWED', 'Method Not Allowed', 405);
  }

  // 1. Read exact RAW request body text BEFORE JSON parsing
  let rawBody: string;
  try { rawBody = await readTextBody(request); }
  catch (caught) { return caught instanceof BodyTooLargeError
    ? error('PAYLOAD_TOO_LARGE', 'Webhook payload is too large', 413)
    : error('VALIDATION_ERROR', 'Unable to read webhook payload', 400); }
  if (!rawBody || rawBody.trim().length === 0) {
    return error('VALIDATION_ERROR', 'Empty webhook request body', 400);
  }

  // 2. Extract Razorpay signature header
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return error('INVALID_SIGNATURE', 'Missing webhook signature header', 400);
  }

  // 3. Retrieve server-side webhook secret
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not configured in Worker environment bindings');
    return error('INTERNAL_ERROR', 'Webhook secret is not configured on server', 500);
  }

  // 4. Verify HMAC-SHA256 signature using native Web Crypto
  const isValidSignature = await verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret);
  if (!isValidSignature) {
    return error('INVALID_SIGNATURE', 'Invalid webhook signature', 400);
  }

  // 5. Parse JSON payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return error('VALIDATION_ERROR', 'Malformed webhook JSON payload', 400);
  }

  if (!payload || typeof payload !== 'object') {
    return error('VALIDATION_ERROR', 'Invalid webhook payload structure', 400);
  }

  // 6. Extract event metadata
  const eventType = typeof payload.event === 'string' ? payload.event : null;
  if (!eventType) {
    return error('VALIDATION_ERROR', 'Missing event type in webhook payload', 400);
  }

  const payloadHash = await computeSha256(rawBody);
  const headerEventId = request.headers.get('x-razorpay-event-id');
  const eventId =
    (typeof headerEventId === 'string' && headerEventId.trim()) ||
    (typeof payload.event_id === 'string' && payload.event_id.trim()) ||
    (typeof payload.id === 'string' && payload.id.trim()) ||
    `evt_${payloadHash.slice(0, 32)}`;

  // 7. Deduplication check in payment_webhook_events ledger
  const existingEvent = await paymentWebhookRepository.findByEventId(db, eventId);
  if (existingEvent && existingEvent.processed_status === 'processed') {
    return success(
      {
        message: 'Event already processed (idempotent)',
        eventId,
        duplicate: true,
      },
      200
    );
  }

  // 8. Extract Payment and Order entities
  const payloadData = (payload.payload || {}) as Record<string, Record<string, unknown>>;
  const paymentEntity = (payloadData.payment?.entity || {}) as Record<string, unknown>;
  const orderEntity = (payloadData.order?.entity || {}) as Record<string, unknown>;

  const providerOrderId =
    (typeof orderEntity.id === 'string' ? orderEntity.id : null) ||
    (typeof paymentEntity.order_id === 'string' ? paymentEntity.order_id : null);

  const providerPaymentId = typeof paymentEntity.id === 'string' ? paymentEntity.id : null;

  // --- QR Payment fallback references ---
  // Razorpay Dynamic UPI QR payments do NOT create a Razorpay Order.
  // The internal TG-ORD- reference travels inside the payment/QR notes,
  // and the QR id is available on the qr_code entity.
  const paymentNotes =
    paymentEntity.notes && typeof paymentEntity.notes === 'object'
      ? (paymentEntity.notes as Record<string, unknown>)
      : {};
  const qrEntity =
    (payloadData.qr_code?.entity && typeof payloadData.qr_code.entity === 'object'
      ? (payloadData.qr_code.entity as Record<string, unknown>)
      : {}) || {};
  const qrNotes =
    qrEntity.notes && typeof qrEntity.notes === 'object'
      ? (qrEntity.notes as Record<string, unknown>)
      : {};

  const orderRefFromNotes =
    (typeof paymentNotes.order_id === 'string' && paymentNotes.order_id.startsWith('TG-ORD-')
      ? paymentNotes.order_id
      : null) ||
    (typeof qrNotes.order_id === 'string' && qrNotes.order_id.startsWith('TG-ORD-')
      ? qrNotes.order_id
      : null);

  const qrIdFromPayload =
    (typeof qrEntity.id === 'string' ? qrEntity.id : null) ||
    (typeof paymentEntity.qr_code_id === 'string' ? paymentEntity.qr_code_id : null);

  const rawAmount =
    typeof paymentEntity.amount === 'number'
      ? paymentEntity.amount
      : typeof orderEntity.amount === 'number'
        ? orderEntity.amount
        : null;

  const rawCurrency =
    (typeof paymentEntity.currency === 'string' ? paymentEntity.currency : null) ||
    (typeof orderEntity.currency === 'string' ? orderEntity.currency : null) ||
    'INR';

  const now = new Date().toISOString();

  // Record initial event ledger state
  if (!existingEvent) {
    await paymentWebhookRepository.create(db, {
      provider: 'razorpay',
      event_id: eventId,
      event_type: eventType,
      provider_order_id: providerOrderId,
      provider_payment_id: providerPaymentId,
      order_id: null,
      amount: rawAmount,
      currency: rawCurrency.toUpperCase(),
      payload_hash: payloadHash,
      processed_status: 'processing',
      processing_error: null,
      received_at: now,
      processed_at: null,
      created_at: now,
    });
  }

  // 9. Order lookup and matching
  // Precedence:
  //   1. Razorpay Order ID (regular Checkout flow)
  //   2. Our internal TG-ORD- reference carried in payment/QR notes (QR direct payment flow)
  //   3. Razorpay QR ID matching orders.qr_id (QR direct payment flow)
  let internalOrder: Awaited<ReturnType<typeof orderRepository.findByProviderOrderId>> = null;

  if (providerOrderId) {
    internalOrder = await orderRepository.findByProviderOrderId(db, providerOrderId);
  }

  if (!internalOrder && orderRefFromNotes) {
    internalOrder = await orderRepository.findByOrderId(db, orderRefFromNotes);
  }

  if (!internalOrder && qrIdFromPayload) {
    internalOrder = await orderRepository.findByQrId(db, qrIdFromPayload);
  }

  if (!internalOrder) {
    const reason = providerOrderId
      ? `No matching internal order found for provider order ID: ${providerOrderId}`
      : orderRefFromNotes
        ? `No matching internal order found for order reference: ${orderRefFromNotes}`
        : 'No provider order ID in webhook payload';
    await paymentWebhookRepository.updateStatus(db, eventId, 'processed', {
      processingError: reason,
      processedAt: now,
      providerOrderId,
      providerPaymentId,
    });
    return success(
      {
        message: 'Webhook acknowledged (no matching internal order)',
        eventId,
        ...(providerOrderId ? { providerOrderId } : {}),
        ...(orderRefFromNotes ? { orderReference: orderRefFromNotes } : {}),
      },
      200
    );
  }

  // 10. Amount and Currency Reconciliation Verification
  const expectedPaise = Math.round(internalOrder.amount * 100);
  if (rawAmount !== null && rawAmount !== expectedPaise) {
    const errorMsg = `Amount mismatch: expected ${expectedPaise} paise (₹${internalOrder.amount}), received ${rawAmount} paise`;
    console.warn(`[Webhook Reconciliation Warning] ${errorMsg} for order ${internalOrder.order_id}`);
    await paymentWebhookRepository.updateStatus(db, eventId, 'failed', {
      processingError: errorMsg,
      processedAt: now,
      orderId: internalOrder.order_id,
      providerOrderId,
      providerPaymentId,
    });
    return success(
      {
        message: 'Reconciliation failed: Amount mismatch',
        eventId,
        orderId: internalOrder.order_id,
      },
      200
    );
  }

  if (rawCurrency && rawCurrency.toUpperCase() !== internalOrder.currency.toUpperCase()) {
    const errorMsg = `Currency mismatch: expected ${internalOrder.currency.toUpperCase()}, received ${rawCurrency.toUpperCase()}`;
    console.warn(`[Webhook Reconciliation Warning] ${errorMsg} for order ${internalOrder.order_id}`);
    await paymentWebhookRepository.updateStatus(db, eventId, 'failed', {
      processingError: errorMsg,
      processedAt: now,
      orderId: internalOrder.order_id,
      providerOrderId,
      providerPaymentId,
    });
    return success(
      {
        message: 'Reconciliation failed: Currency mismatch',
        eventId,
        orderId: internalOrder.order_id,
      },
      200
    );
  }

  // 11. Payment ID Consistency & Paid State Checks
  if (internalOrder.status === 'paid') {
    if (
      internalOrder.provider_payment_id &&
      providerPaymentId &&
      internalOrder.provider_payment_id !== providerPaymentId
    ) {
      const discrepancyMsg = `Discrepancy: order already paid with payment ID ${internalOrder.provider_payment_id}, received event with ${providerPaymentId}`;
      console.warn(`[Webhook Reconciliation Warning] ${discrepancyMsg}`);
      await paymentWebhookRepository.updateStatus(db, eventId, 'processed', {
        processingError: discrepancyMsg,
        processedAt: now,
        orderId: internalOrder.order_id,
        providerOrderId,
        providerPaymentId,
      });
      return success(
        {
          message: 'Order already paid with different payment reference',
          eventId,
          orderId: internalOrder.order_id,
        },
        200
      );
    }

    // Already paid with matching/compatible reference -> idempotent
    // Phase 9: Ensure a delivery record exists even when the order was
    // already paid via the Checkout verify-payment endpoint.
    try {
      await prepareDelivery(
        db,
        internalOrder.order_id,
        env
      );
    } catch (deliveryErr) {
      console.error(
        `[Webhook] Delivery preparation (already paid) failed for order ${internalOrder.order_id}:`,
        deliveryErr
      );
    }
    try {
      await ensurePurchaseReceipt(db, internalOrder.order_id, env);
    } catch (receiptError) {
      console.error(`[Webhook] Receipt processing failed for order ${internalOrder.order_id}:`, receiptError);
    }

    await paymentWebhookRepository.updateStatus(db, eventId, 'processed', {
      processedAt: now,
      orderId: internalOrder.order_id,
      providerOrderId,
      providerPaymentId,
    });
    return success(
      {
        message: 'Order already paid (idempotent)',
        eventId,
        orderId: internalOrder.order_id,
      },
      200
    );
  }

  // 12. State Reconciliation Transitions based on Event Type
  if (eventType === 'order.paid' || eventType === 'payment.captured') {
    if (internalOrder.status === 'created' || internalOrder.status === 'payment_pending') {
      // IMPORTANT: order is marked paid only after the confirmed amount,
      // currency, signature, and matching order are verified above.
      await orderRepository.markPaid(
        db,
        internalOrder.order_id,
        providerPaymentId || 'webhook_reconciled',
        'webhook_verified'
      );
    }

    // Phase 9 — Digital Delivery preparation.
    // Runs ONLY after the order is confirmed paid (markPaid above or
    // already-paid idempotent path). Idempotent: existing delivery is reused.
    try {
      await prepareDelivery(
        db,
        internalOrder.order_id,
        env
      );
    } catch (deliveryErr) {
      console.error(
        `[Webhook] Delivery preparation failed for order ${internalOrder.order_id}:`,
        deliveryErr
      );
    }
    try {
      await ensurePurchaseReceipt(db, internalOrder.order_id, env);
    } catch (receiptError) {
      console.error(`[Webhook] Receipt processing failed for order ${internalOrder.order_id}:`, receiptError);
    }
  } else if (eventType === 'payment.failed') {
    if (internalOrder.status === 'created' || internalOrder.status === 'payment_pending') {
      const failureReason =
        (typeof paymentEntity.error_description === 'string' && paymentEntity.error_description) ||
        'Payment failed (reported via webhook)';
      await orderRepository.updateStatus(db, internalOrder.order_id, 'payment_failed', failureReason);
    }
  } else {
    // Informational or other lifecycle events (payment.authorized, refund.created, etc.)
    // Safely acknowledged without corrupting internal order state
  }

  // 13. Finalize event ledger record
  await paymentWebhookRepository.updateStatus(db, eventId, 'processed', {
    processedAt: now,
    orderId: internalOrder.order_id,
    providerOrderId,
    providerPaymentId,
  });

  return success(
    {
      message: 'Webhook processed successfully',
      eventId,
      eventType,
      orderId: internalOrder.order_id,
    },
    200
  );
}
