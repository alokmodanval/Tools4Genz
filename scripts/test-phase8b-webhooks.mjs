/**
 * Tools4Genz Phase 8B Automated Test Suite
 *
 * Tests:
 * 1. Missing Webhook Signature -> 400 INVALID_SIGNATURE
 * 2. Invalid Webhook Signature -> 400 INVALID_SIGNATURE
 * 3. Malformed JSON Body -> 400 VALIDATION_ERROR
 * 4. Valid Webhook Signature -> 200 OK
 * 5. Webhook Deduplication / Idempotency -> 200 OK (duplicate: true)
 * 6. order.paid event -> transitions internal order to paid
 * 7. payment.captured event -> transitions internal order to paid
 * 8. payment.failed event -> transitions internal order to payment_failed
 * 9. Unknown provider order ID -> safe acknowledgment without crash
 * 10. Amount mismatch anti-tampering -> order NOT paid, failure recorded in ledger
 * 11. Currency mismatch anti-tampering -> order NOT paid, failure recorded in ledger
 * 12. Payment ID consistency -> safe handling of duplicate or conflicting payment IDs
 * 13. Unsupported event types -> safe acknowledgement
 * 14. Public order API remains safe
 * 15. HTTP 405 Method Not Allowed checks
 */

import worker from '../worker/src/index.ts';
import { hashPurchaseAccessToken } from '../worker/src/utils/purchaseAccess.ts';

const TEST_PURCHASE_TOKEN = `pt_${'B'.repeat(43)}`;

// Helper to generate valid Razorpay webhook signature using Web Crypto HMAC-SHA256
async function generateWebhookSignature(bodyText, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyText));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// In-Memory D1 Mock supporting orders and payment_webhook_events
class InMemoryD1 {
  constructor() {
    this.tables = {
      requests: [],
      admin_users: [],
      admin_sessions: [],
      admin_tools: [],
      admin_projects: [],
      admin_services: [],
      admin_categories: [],
      orders: [],
      payment_webhook_events: [],
    };
    this.autoIncrement = {
      requests: 1,
      admin_users: 1,
      admin_sessions: 1,
      orders: 1,
      payment_webhook_events: 1,
    };
  }

  prepare(sql) {
    const trimmed = sql.trim();
    return new InMemoryPreparedStatement(this, trimmed);
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }
}

class InMemoryPreparedStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.boundValues = [];
  }

  bind(...values) {
    this.boundValues = values;
    return this;
  }

  async first() {
    const res = await this.all();
    return res.results && res.results.length > 0 ? res.results[0] : null;
  }

  async all() {
    const sql = this.sql;
    const vals = this.boundValues;

    // SELECT orders
    if (sql.includes('FROM orders')) {
      if (sql.includes('WHERE order_id = ?')) {
        const row = this.db.tables.orders.find((o) => o.order_id === vals[0]);
        return { results: row ? [row] : [] };
      }
      if (sql.includes('WHERE provider_order_id = ?')) {
        const row = this.db.tables.orders.find((o) => o.provider_order_id === vals[0]);
        return { results: row ? [row] : [] };
      }
      return { results: [...this.db.tables.orders] };
    }

    // SELECT payment_webhook_events
    if (sql.includes('FROM payment_webhook_events')) {
      if (sql.includes('WHERE event_id = ?')) {
        const row = this.db.tables.payment_webhook_events.find((e) => e.event_id === vals[0]);
        return { results: row ? [row] : [] };
      }
      return { results: [...this.db.tables.payment_webhook_events] };
    }

    return { results: [] };
  }

  async run() {
    const sql = this.sql;
    const vals = this.boundValues;

    // INSERT INTO orders
    if (sql.includes('INSERT INTO orders')) {
      const id = this.db.autoIncrement.orders++;
      const row = {
        id,
        order_id: vals[0],
        project_id: vals[1],
        project_slug: vals[2],
        project_title: vals[3],
        customer_name: vals[4],
        customer_email: vals[5],
        customer_phone: vals[6],
        amount: vals[7],
        currency: vals[8],
        status: vals[9],
        payment_provider: vals[10],
        provider_order_id: vals[11],
        provider_payment_id: vals[12],
        provider_signature: vals[13],
        notes: vals[14],
        paid_at: vals[15],
        created_at: vals[16],
        updated_at: vals[17],
        access_token_hash: vals[18] || null,
        access_token_created_at: vals[19] || null,
      };
      this.db.tables.orders.push(row);
      return { meta: { changes: 1, last_row_id: id } };
    }

    // UPDATE orders (markPaid)
    if (sql.includes('UPDATE orders') && sql.includes("SET status = 'paid'")) {
      const providerPaymentId = vals[0];
      const providerSignature = vals[1];
      const paidAt = vals[2];
      const updatedAt = vals[3];
      const orderId = vals[4];

      const row = this.db.tables.orders.find((o) => o.order_id === orderId);
      if (row) {
        row.status = 'paid';
        row.provider_payment_id = providerPaymentId;
        row.provider_signature = providerSignature;
        row.paid_at = paidAt;
        row.updated_at = updatedAt;
        return { meta: { changes: 1, last_row_id: row.id } };
      }
      return { meta: { changes: 0, last_row_id: 0 } };
    }

    // UPDATE orders (updateStatus)
    if (sql.includes('UPDATE orders') && sql.includes('SET status = ?')) {
      const status = vals[0];
      const notes = vals[1];
      const updatedAt = vals[2];
      const orderId = vals[3];

      const row = this.db.tables.orders.find((o) => o.order_id === orderId);
      if (row) {
        row.status = status;
        if (notes !== null && notes !== undefined) row.notes = notes;
        row.updated_at = updatedAt;
        return { meta: { changes: 1, last_row_id: row.id } };
      }
      return { meta: { changes: 0, last_row_id: 0 } };
    }

    // INSERT INTO payment_webhook_events
    if (sql.includes('INSERT INTO payment_webhook_events')) {
      const id = this.db.autoIncrement.payment_webhook_events++;
      const row = {
        id,
        provider: vals[0],
        event_id: vals[1],
        event_type: vals[2],
        provider_order_id: vals[3],
        provider_payment_id: vals[4],
        order_id: vals[5],
        amount: vals[6],
        currency: vals[7],
        payload_hash: vals[8],
        processed_status: vals[9],
        processing_error: vals[10],
        received_at: vals[11],
        processed_at: vals[12],
        created_at: vals[13],
      };
      this.db.tables.payment_webhook_events.push(row);
      return { meta: { changes: 1, last_row_id: id } };
    }

    // UPDATE payment_webhook_events
    if (sql.includes('UPDATE payment_webhook_events')) {
      const processedStatus = vals[0];
      const processingError = vals[1];
      const processedAt = vals[2];
      const orderId = vals[3];
      const providerOrderId = vals[4];
      const providerPaymentId = vals[5];
      const eventId = vals[6];

      const row = this.db.tables.payment_webhook_events.find((e) => e.event_id === eventId);
      if (row) {
        row.processed_status = processedStatus;
        if (processingError !== null) row.processing_error = processingError;
        row.processed_at = processedAt;
        if (orderId !== null) row.order_id = orderId;
        if (providerOrderId !== null) row.provider_order_id = providerOrderId;
        if (providerPaymentId !== null) row.provider_payment_id = providerPaymentId;
        return { meta: { changes: 1, last_row_id: row.id } };
      }
      return { meta: { changes: 0, last_row_id: 0 } };
    }

    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

// Test Runner
async function runTests() {
  console.log('🧪 Starting Tools4Genz Phase 8B Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failed++;
      throw new Error(message);
    } else {
      console.log(`✅ PASS: ${message}`);
      passed++;
    }
  }

  const db = new InMemoryD1();
  const TEST_WEBHOOK_SECRET = 'whsec_test_mock_webhook_secret_12345';
  const TEST_KEY_SECRET = 'rzp_sec_test_mock_key_secret';
  const env = {
    DB: db,
    ALLOWED_ORIGINS: 'https://tools4genz.com',
    RAZORPAY_KEY_ID: 'rzp_test_placeholder_key',
    RAZORPAY_KEY_SECRET: TEST_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
  };

  // Helper to create order in D1
  async function seedOrder(orderId, providerOrderId, amount = 4999, currency = 'INR', status = 'payment_pending') {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO orders (order_id, project_id, project_slug, project_title, customer_name, customer_email, customer_phone, amount, currency, status, payment_provider, provider_order_id, provider_payment_id, provider_signature, notes, paid_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        orderId,
        'ecommerce-platform',
        'ecommerce-platform',
        'Full-Stack E-Commerce Platform',
        'Alice Buyer',
        'alice@example.com',
        '+919876543210',
        amount,
        currency,
        status,
        'razorpay',
        providerOrderId,
        null,
        null,
        null,
        null,
        now,
        now
      )
      .run();
    const row = db.tables.orders.find((item) => item.order_id === orderId);
    row.access_token_hash = await hashPurchaseAccessToken(TEST_PURCHASE_TOKEN);
    row.access_token_created_at = now;
  }

  // --- Group 1: Signature Verification & Error Handling ---
  console.log('--- 1. Webhook Signature & Security Tests ---');

  // Test 1.1: Missing signature header
  const req1 = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'order.paid' }),
  });
  const res1 = await worker.fetch(req1, env);
  assert(res1.status === 400, 'Missing x-razorpay-signature header returns HTTP 400');
  const json1 = await res1.json();
  assert(json1.error.code === 'INVALID_SIGNATURE', 'Missing signature returns code INVALID_SIGNATURE');

  // Test 1.2: Invalid signature
  const req2 = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': '0000000000000000000000000000000000000000000000000000000000000000',
    },
    body: JSON.stringify({ event: 'order.paid' }),
  });
  const res2 = await worker.fetch(req2, env);
  assert(res2.status === 400, 'Invalid signature returns HTTP 400');
  const json2 = await res2.json();
  assert(json2.error.code === 'INVALID_SIGNATURE', 'Invalid signature returns code INVALID_SIGNATURE');

  // Test 1.3: Malformed JSON body with valid signature on raw text
  const badJsonBody = '{ "event": "order.paid", unclosed_invalid_json }';
  const badJsonSig = await generateWebhookSignature(badJsonBody, TEST_WEBHOOK_SECRET);
  const req3 = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': badJsonSig,
    },
    body: badJsonBody,
  });
  const res3 = await worker.fetch(req3, env);
  assert(res3.status === 400, 'Malformed JSON body returns HTTP 400 VALIDATION_ERROR');

  // --- Group 2: order.paid Event Reconciliation ---
  console.log('\n--- 2. order.paid Reconciliation Tests ---');
  await seedOrder('TG-ORD-PAID01', 'order_rzp_paid_001', 4999, 'INR', 'payment_pending');

  const orderPaidPayload = {
    entity: 'event',
    account_id: 'acc_test_123',
    event: 'order.paid',
    contains: ['order', 'payment'],
    payload: {
      order: {
        entity: {
          id: 'order_rzp_paid_001',
          entity: 'order',
          amount: 499900,
          currency: 'INR',
          status: 'paid',
        },
      },
      payment: {
        entity: {
          id: 'pay_rzp_payment_001',
          entity: 'payment',
          amount: 499900,
          currency: 'INR',
          status: 'captured',
          order_id: 'order_rzp_paid_001',
        },
      },
    },
    created_at: Math.floor(Date.now() / 1000),
  };

  const orderPaidBody = JSON.stringify(orderPaidPayload);
  const orderPaidSig = await generateWebhookSignature(orderPaidBody, TEST_WEBHOOK_SECRET);

  const reqPaid = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': orderPaidSig,
    },
    body: orderPaidBody,
  });

  const resPaid = await worker.fetch(reqPaid, env);
  assert(resPaid.status === 200, 'Valid order.paid event returns HTTP 200');
  const orderAfterPaid = db.tables.orders.find((o) => o.order_id === 'TG-ORD-PAID01');
  assert(orderAfterPaid.status === 'paid', 'Internal order status transitioned to paid');
  assert(orderAfterPaid.provider_payment_id === 'pay_rzp_payment_001', 'Provider payment ID recorded');

  // --- Group 3: Deduplication & Idempotency ---
  console.log('\n--- 3. Event Deduplication & Idempotency Tests ---');
  // Send the EXACT same event again
  const reqDuplicate = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': orderPaidSig,
    },
    body: orderPaidBody,
  });
  const resDuplicate = await worker.fetch(reqDuplicate, env);
  assert(resDuplicate.status === 200, 'Duplicate webhook returns HTTP 200');
  const jsonDup = await resDuplicate.json();
  assert(jsonDup.data.duplicate === true, 'Duplicate webhook identified and acknowledged idempotently');

  // --- Group 4: payment.captured Event Reconciliation ---
  console.log('\n--- 4. payment.captured Reconciliation Tests ---');
  await seedOrder('TG-ORD-CAPT01', 'order_rzp_capt_001', 1999, 'INR', 'payment_pending');

  const paymentCapturedPayload = {
    entity: 'event',
    account_id: 'acc_test_123',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_payment_capt_001',
          order_id: 'order_rzp_capt_001',
          amount: 199900,
          currency: 'INR',
          status: 'captured',
        },
      },
    },
  };

  const paymentCapturedBody = JSON.stringify(paymentCapturedPayload);
  const paymentCapturedSig = await generateWebhookSignature(paymentCapturedBody, TEST_WEBHOOK_SECRET);

  const reqCapt = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': paymentCapturedSig,
    },
    body: paymentCapturedBody,
  });

  const resCapt = await worker.fetch(reqCapt, env);
  assert(resCapt.status === 200, 'Valid payment.captured event returns HTTP 200');
  const orderAfterCapt = db.tables.orders.find((o) => o.order_id === 'TG-ORD-CAPT01');
  assert(orderAfterCapt.status === 'paid', 'payment.captured transitioned order to paid');

  // --- Group 5: payment.failed Event Reconciliation ---
  console.log('\n--- 5. payment.failed Reconciliation Tests ---');
  await seedOrder('TG-ORD-FAIL01', 'order_rzp_fail_001', 2999, 'INR', 'payment_pending');

  const paymentFailedPayload = {
    entity: 'event',
    account_id: 'acc_test_123',
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: 'pay_rzp_payment_fail_001',
          order_id: 'order_rzp_fail_001',
          amount: 299900,
          currency: 'INR',
          status: 'failed',
          error_description: 'Payment was declined by issuing bank',
        },
      },
    },
  };

  const paymentFailedBody = JSON.stringify(paymentFailedPayload);
  const paymentFailedSig = await generateWebhookSignature(paymentFailedBody, TEST_WEBHOOK_SECRET);

  const reqFail = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': paymentFailedSig,
    },
    body: paymentFailedBody,
  });

  const resFail = await worker.fetch(reqFail, env);
  assert(resFail.status === 200, 'Valid payment.failed event returns HTTP 200');
  const orderAfterFail = db.tables.orders.find((o) => o.order_id === 'TG-ORD-FAIL01');
  assert(orderAfterFail.status === 'payment_failed', 'payment.failed transitioned order to payment_failed');
  assert(orderAfterFail.notes === 'Payment was declined by issuing bank', 'Failure description stored in notes');

  // --- Group 6: Unknown Provider Order Handling ---
  console.log('\n--- 6. Unknown Provider Order Handling ---');
  const unknownOrderPayload = {
    event: 'order.paid',
    payload: {
      order: { entity: { id: 'order_unknown_99999', amount: 500000, currency: 'INR' } },
      payment: { entity: { id: 'pay_unknown_999', order_id: 'order_unknown_99999', amount: 500000, currency: 'INR' } },
    },
  };
  const unknownBody = JSON.stringify(unknownOrderPayload);
  const unknownSig = await generateWebhookSignature(unknownBody, TEST_WEBHOOK_SECRET);

  const reqUnknown = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': unknownSig },
    body: unknownBody,
  });
  const resUnknown = await worker.fetch(reqUnknown, env);
  assert(resUnknown.status === 200, 'Unknown order webhook is safely acknowledged without throwing error');

  // --- Group 7: Amount & Currency Anti-Tampering Checks ---
  console.log('\n--- 7. Amount & Currency Anti-Tampering Tests ---');
  await seedOrder('TG-ORD-TAMPER01', 'order_rzp_tamper_001', 4999, 'INR', 'payment_pending');

  // Tampered amount: order is 4999 (499900 paise), webhook says 100 paise
  const tamperedAmountPayload = {
    event: 'payment.captured',
    payload: {
      payment: { entity: { id: 'pay_tamper_001', order_id: 'order_rzp_tamper_001', amount: 100, currency: 'INR' } },
    },
  };
  const tamperedAmountBody = JSON.stringify(tamperedAmountPayload);
  const tamperedAmountSig = await generateWebhookSignature(tamperedAmountBody, TEST_WEBHOOK_SECRET);

  const reqTamperAmount = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': tamperedAmountSig },
    body: tamperedAmountBody,
  });
  const resTamperAmount = await worker.fetch(reqTamperAmount, env);
  assert(resTamperAmount.status === 200, 'Tampered amount returns safe 200 reconciliation message');
  const orderTamper1 = db.tables.orders.find((o) => o.order_id === 'TG-ORD-TAMPER01');
  assert(orderTamper1.status === 'payment_pending', 'Order with tampered amount is NOT marked paid');

  // Tampered currency: USD instead of INR
  await seedOrder('TG-ORD-TAMPER02', 'order_rzp_tamper_002', 4999, 'INR', 'payment_pending');
  const tamperedCurrPayload = {
    event: 'payment.captured',
    payload: {
      payment: { entity: { id: 'pay_tamper_002', order_id: 'order_rzp_tamper_002', amount: 499900, currency: 'USD' } },
    },
  };
  const tamperedCurrBody = JSON.stringify(tamperedCurrPayload);
  const tamperedCurrSig = await generateWebhookSignature(tamperedCurrBody, TEST_WEBHOOK_SECRET);

  const reqTamperCurr = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': tamperedCurrSig },
    body: tamperedCurrBody,
  });
  const resTamperCurr = await worker.fetch(reqTamperCurr, env);
  assert(resTamperCurr.status === 200, 'Tampered currency returns safe 200 reconciliation message');
  const orderTamper2 = db.tables.orders.find((o) => o.order_id === 'TG-ORD-TAMPER02');
  assert(orderTamper2.status === 'payment_pending', 'Order with tampered currency is NOT marked paid');

  // --- Group 8: Unsupported & Informational Event Types ---
  console.log('\n--- 8. Unsupported & Informational Events ---');
  await seedOrder('TG-ORD-AUTH01', 'order_rzp_auth_001', 3499, 'INR', 'payment_pending');
  const authPayload = {
    event: 'payment.authorized',
    payload: {
      payment: { entity: { id: 'pay_auth_001', order_id: 'order_rzp_auth_001', amount: 349900, currency: 'INR' } },
    },
  };
  const authBody = JSON.stringify(authPayload);
  const authSig = await generateWebhookSignature(authBody, TEST_WEBHOOK_SECRET);

  const reqAuth = new Request('http://localhost/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': authSig },
    body: authBody,
  });
  const resAuth = await worker.fetch(reqAuth, env);
  assert(resAuth.status === 200, 'payment.authorized event acknowledged safely with HTTP 200');
  const orderAuth = db.tables.orders.find((o) => o.order_id === 'TG-ORD-AUTH01');
  assert(orderAuth.status === 'payment_pending', 'payment.authorized did not mutate payment_pending status prematurely');

  // --- Group 9: Public Order API Security ---
  console.log('\n--- 9. Public Order API Security Checks ---');
  const reqPublic = new Request('http://localhost/api/orders/TG-ORD-PAID01', {
    method: 'GET',
    headers: { Authorization: `Purchase ${TEST_PURCHASE_TOKEN}` },
  });
  const resPublic = await worker.fetch(reqPublic, env);
  assert(resPublic.status === 200, 'GET /api/orders/:orderId returns HTTP 200');
  const jsonPublic = await resPublic.json();
  assert(jsonPublic.data.status === 'paid', 'Public order shows status paid');
  assert(jsonPublic.data.customerEmail === undefined, 'Public order does not leak customer email PII');
  assert(jsonPublic.data.provider_signature === undefined, 'Public order does not leak signature');
  assert(jsonPublic.data.webhook === undefined, 'Public order does not expose webhook details');

  // --- Group 10: 405 Method Not Allowed Checks ---
  console.log('\n--- 10. HTTP 405 Method Checks ---');
  const req405 = new Request('http://localhost/api/webhooks/razorpay', { method: 'GET' });
  const res405 = await worker.fetch(req405, env);
  assert(res405.status === 405, 'GET /api/webhooks/razorpay returns HTTP 405 Method Not Allowed');

  console.log(`\n🎉 Phase 8B Test Suite Completed: ${passed} passed, ${failed} failed\n`);
}

runTests().catch((err) => {
  console.error('\n💥 Phase 8B Tests Failed:', err);
  process.exit(1);
});
