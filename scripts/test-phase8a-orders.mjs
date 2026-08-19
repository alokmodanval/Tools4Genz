/**
 * Tools4Genz Phase 8A Automated Test Suite
 *
 * Tests:
 * 1. D1 Orders Table & Repository
 * 2. Authoritative Server Pricing (Resistance to tampering)
 * 3. Internal Order Creation & Razorpay Order ID assignment
 * 4. Web Crypto HMAC-SHA256 Signature Verification (Valid vs Invalid)
 * 5. Idempotent Payment Verification
 * 6. Safe Public Order Lookup
 * 7. HTTP Status & 405 Method Not Allowed checks
 */

import worker from '../worker/src/index.ts';

// In-Memory D1 Mock
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
    };
    this.autoIncrement = {
      requests: 1,
      admin_users: 1,
      admin_sessions: 1,
      orders: 1,
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
    const allRes = await this.all();
    return allRes.results[0] || null;
  }

  async all() {
    const sql = this.sql;
    const vals = this.boundValues;

    // SELECT COUNT(*) as c FROM orders
    if (sql.includes('SELECT COUNT(*) as c FROM orders')) {
      return { results: [{ c: this.db.tables.orders.length }] };
    }

    // SELECT * FROM orders WHERE order_id = ?
    if (sql.startsWith('SELECT * FROM orders WHERE order_id = ?')) {
      const match = this.db.tables.orders.find((o) => o.order_id === vals[0]);
      return { results: match ? [{ ...match }] : [] };
    }

    // SELECT * FROM orders WHERE provider_order_id = ?
    if (sql.startsWith('SELECT * FROM orders WHERE provider_order_id = ?')) {
      const match = this.db.tables.orders.find((o) => o.provider_order_id === vals[0]);
      return { results: match ? [{ ...match }] : [] };
    }

    // SELECT order_id, project_id, project_slug, project_title... FROM orders WHERE order_id = ?
    if (sql.includes('FROM orders') && sql.includes('WHERE order_id = ?')) {
      const match = this.db.tables.orders.find((o) => o.order_id === vals[0]);
      if (!match) return { results: [] };
      return {
        results: [
          {
            order_id: match.order_id,
            project_id: match.project_id,
            project_slug: match.project_slug,
            project_title: match.project_title,
            amount: match.amount,
            currency: match.currency,
            status: match.status,
            payment_provider: match.payment_provider,
            provider_payment_id: match.provider_payment_id,
            paid_at: match.paid_at,
            created_at: match.created_at,
          },
        ],
      };
    }

    // Admin project lookup
    if (sql.startsWith('SELECT * FROM admin_projects WHERE id = ?')) {
      const match = this.db.tables.admin_projects.find((p) => p.id === vals[0]);
      return { results: match ? [{ ...match }] : [] };
    }

    // Default empty
    return { results: [] };
  }

  async run() {
    const sql = this.sql;
    const vals = this.boundValues;

    // INSERT INTO orders
    if (sql.startsWith('INSERT INTO orders')) {
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
        access_token_hash: vals[18],
        access_token_created_at: vals[19],
      };
      this.db.tables.orders.push(row);
      return { meta: { changes: 1, last_row_id: id } };
    }

    // UPDATE orders SET provider_order_id = ?, status = ?, updated_at = ? WHERE order_id = ?
    if (sql.includes('UPDATE orders') && sql.includes('SET provider_order_id = ?')) {
      const target = this.db.tables.orders.find((o) => o.order_id === vals[3]);
      if (target) {
        target.provider_order_id = vals[0];
        target.status = vals[1];
        target.updated_at = vals[2];
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    // UPDATE orders SET status = 'paid', provider_payment_id = ?, provider_signature = ?, paid_at = ?, updated_at = ? WHERE order_id = ?
    if (sql.includes("SET status = 'paid'")) {
      const target = this.db.tables.orders.find((o) => o.order_id === vals[4]);
      if (target) {
        target.status = 'paid';
        target.provider_payment_id = vals[0];
        target.provider_signature = vals[1];
        target.paid_at = vals[2];
        target.updated_at = vals[3];
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    // Generic UPDATE orders SET status = ?
    if (sql.includes('UPDATE orders SET status = ?')) {
      const target = this.db.tables.orders.find((o) => o.order_id === vals[3]);
      if (target) {
        target.status = vals[0];
        if (vals[1]) target.notes = vals[1];
        target.updated_at = vals[2];
        return { meta: { changes: 1 } };
      }
      return { meta: { changes: 0 } };
    }

    return { meta: { changes: 0 } };
  }
}

// Helper to compute HMAC-SHA256 signature for test validation
async function computeTestSignature(orderId, paymentId, secret) {
  const data = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function runTests() {
  console.log('🧪 Starting Tools4Genz Phase 8A Automated Test Suite...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    } else {
      console.log(`✅ PASS: ${message}`);
      passed++;
    }
  }

  const db = new InMemoryD1();
  const TEST_SECRET = 'rzp_test_secret_key_884920';
  const env = {
    DB: db,
    ALLOWED_ORIGINS: 'http://localhost:5173,https://tools4genz.com',
    RAZORPAY_KEY_ID: 'rzp_test_public_key',
    RAZORPAY_KEY_SECRET: TEST_SECRET,
    PURCHASE_AVAILABILITY_BYPASS: 'test-only',
  };

  // 1. Order Validation & Authoritative Price Resolution
  console.log('--- 1. Order Creation & Price Integrity Tests ---');

  // Non-existent project
  const notFoundResp = await worker.fetch(
    new Request('https://api.tools4genz.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'fake-nonexistent-project',
        customerName: 'Aarav Patel',
        customerEmail: 'aarav@example.com',
      }),
    }),
    env
  );
  assert(notFoundResp.status === 404, 'Order for non-existent project returns HTTP 404');

  // Invalid customer email
  const badEmailResp = await worker.fetch(
    new Request('https://api.tools4genz.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'ecommerce-platform',
        customerName: 'Aarav Patel',
        customerEmail: 'not-an-email',
      }),
    }),
    env
  );
  assert(badEmailResp.status === 400, 'Order with invalid email returns HTTP 400');

  // Price tampering attempt (browser attempts to pass amount: 1)
  const tamperResp = await worker.fetch(
    new Request('https://api.tools4genz.com/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: 'ecommerce-platform',
        customerName: 'Aarav Patel',
        customerEmail: 'aarav@example.com',
        customerPhone: '+919876543210',
        amount: 1, // Tampered price
        price: 1,
        currency: 'USD',
      }),
    }),
    env
  );
  assert(tamperResp.status === 201, 'Order created successfully with HTTP 201');
  const orderData = (await tamperResp.json()).data;
  assert(orderData.amount === 4999, 'Worker resolved authoritative price (₹4999) and ignored tampered input');
  assert(orderData.currency === 'INR', 'Worker resolved authoritative currency (INR)');
  assert(orderData.orderId.startsWith('TG-ORD-'), 'Order ID has TG-ORD- prefix');
  assert(orderData.providerOrderId.length > 0, 'Razorpay provider order ID is assigned');
  assert(orderData.keyId === 'rzp_test_public_key', 'Returns public Razorpay Key ID for frontend checkout');

  // 2. Safe Public Order Lookup
  console.log('\n--- 2. Public Order Lookup Tests ---');
  const getOrderResp = await worker.fetch(
    new Request(`https://api.tools4genz.com/api/orders/${orderData.orderId}`, {
      method: 'GET',
      headers: { Authorization: `Purchase ${orderData.accessToken}` },
    }),
    env
  );
  assert(getOrderResp.status === 200, 'GET /api/orders/:orderId returns HTTP 200');
  const getOrderData = (await getOrderResp.json()).data;
  assert(getOrderData.status === 'payment_pending', 'Initial order status is payment_pending');
  assert(getOrderData.projectTitle === 'Full-Stack E-Commerce Platform', 'Project title matches catalog');
  assert(getOrderData.customerEmail === undefined, 'Public order lookup does not leak customer email PII');

  // 3. Payment Signature Verification Tests
  console.log('\n--- 3. Web Crypto Signature Verification Tests ---');
  const testPaymentId = 'pay_Test123456789';

  // Invalid signature
  const badSigResp = await worker.fetch(
    new Request(`https://api.tools4genz.com/api/orders/${orderData.orderId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderData.providerOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: 'invalid_forged_signature_hex_code_123',
      }),
    }),
    env
  );
  assert(badSigResp.status === 400, 'Invalid signature returns HTTP 400');
  const badSigJson = await badSigResp.json();
  assert(badSigJson.error.code === 'INVALID_SIGNATURE', 'Error code is INVALID_SIGNATURE');

  // Valid signature
  const validSignature = await computeTestSignature(orderData.providerOrderId, testPaymentId, TEST_SECRET);
  const goodSigResp = await worker.fetch(
    new Request(`https://api.tools4genz.com/api/orders/${orderData.orderId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderData.providerOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      }),
    }),
    env
  );
  assert(goodSigResp.status === 200, 'Valid signature returns HTTP 200 OK');
  const verifyData = (await goodSigResp.json()).data;
  assert(verifyData.status === 'paid', 'Order status transitioned to paid');
  assert(verifyData.providerPaymentId === testPaymentId, 'Provider payment ID recorded');

  // 4. Idempotency Test
  console.log('\n--- 4. Idempotency Tests ---');
  const duplicateVerifyResp = await worker.fetch(
    new Request(`https://api.tools4genz.com/api/orders/${orderData.orderId}/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderData.providerOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      }),
    }),
    env
  );
  assert(duplicateVerifyResp.status === 200, 'Duplicate payment verification returns HTTP 200 without duplicate execution');
  const dupData = (await duplicateVerifyResp.json()).data;
  assert(dupData.status === 'paid', 'Duplicate call returns confirmed paid state');

  // Verify status in DB
  const postPaidOrderResp = await worker.fetch(
    new Request(`https://api.tools4genz.com/api/orders/${orderData.orderId}`, {
      method: 'GET',
      headers: { Authorization: `Purchase ${orderData.accessToken}` },
    }),
    env
  );
  const postPaidData = (await postPaidOrderResp.json()).data;
  assert(postPaidData.status === 'paid', 'D1 database status confirmed as paid');
  assert(postPaidData.providerPaymentId === undefined, 'Customer status does not expose provider payment reference');

  // 5. Method Not Allowed & Security
  console.log('\n--- 5. Method Not Allowed & Security Checks ---');
  const methodNotAllowedResp = await worker.fetch(
    new Request('https://api.tools4genz.com/api/orders', {
      method: 'PUT',
    }),
    env
  );
  assert(methodNotAllowedResp.status === 405, 'PUT /api/orders returns HTTP 405 Method Not Allowed');

  console.log(`\n🎉 Phase 8A Test Suite Completed: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
