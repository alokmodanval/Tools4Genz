/**
 * Tools4Genz Phase 8A Production Live Verification
 *
 * Tests the live order and payment endpoints on Cloudflare Worker:
 * https://tools4genz-api.alokmodanwal940.workers.dev
 */

const PROD_URL = 'https://tools4genz-api.alokmodanwal940.workers.dev';

async function run() {
  console.log('🚀 Starting Phase 8A Production Live Verification against:', PROD_URL, '\n');

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

  // 1. Health & D1 connectivity
  console.log('--- 1. Health & Database Connectivity ---');
  const healthResp = await fetch(`${PROD_URL}/api/health`);
  assert(healthResp.status === 200, 'GET /api/health returned 200 OK');
  const healthData = await healthResp.json();
  assert(healthData.data.database === 'configured', 'D1 Database is configured and reachable');

  // 2. Reject invalid/non-existent project
  console.log('\n--- 2. Order Creation Validation ---');
  const badProjResp = await fetch(`${PROD_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'invalid-non-existent-slug',
      customerName: 'Test Buyer',
      customerEmail: 'test.buyer@tools4genz.com',
    }),
  });
  assert(badProjResp.status === 404, 'POST /api/orders with invalid project returned 404 Not Found');

  // 3. Create real test order with price tampering attempt
  console.log('\n--- 3. Authoritative Order Creation & Price Tampering Resistance ---');
  const createOrderResp = await fetch(`${PROD_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'ecommerce-platform',
      customerName: 'Test Buyer',
      customerEmail: 'test.buyer@tools4genz.com',
      customerPhone: '+919876543210',
      amount: 1, // Tampering attempt
      price: 1,
      currency: 'USD',
    }),
  });
  assert(createOrderResp.status === 201, 'POST /api/orders succeeded with HTTP 201 Created');
  const createData = (await createOrderResp.json()).data;
  assert(createData.orderId.startsWith('TG-ORD-'), `Internal order ID generated: ${createData.orderId}`);
  assert(createData.amount === 4999, 'Server enforced authoritative price of ₹4999 (tampered amount ignored)');
  assert(createData.currency === 'INR', 'Server enforced currency as INR');
  assert(typeof createData.providerOrderId === 'string' && createData.providerOrderId.length > 0, `Provider Order ID created: ${createData.providerOrderId}`);
  assert(typeof createData.keyId === 'string' && createData.keyId.startsWith('rzp_test_'), `Public Razorpay Key ID returned: ${createData.keyId}`);
  assert(createData.keySecret === undefined, 'Razorpay Key Secret is NEVER returned to the client');

  // 4. Safe public order lookup
  console.log('\n--- 4. Safe Public Order Lookup ---');
  const lookupResp = await fetch(`${PROD_URL}/api/orders/${createData.orderId}`);
  assert(lookupResp.status === 200, 'GET /api/orders/:orderId returned 200 OK');
  const lookupData = (await lookupResp.json()).data;
  assert(lookupData.orderId === createData.orderId, 'Order ID matches in D1');
  assert(lookupData.status === 'payment_pending', 'Initial order status in D1 is payment_pending');
  assert(lookupData.projectTitle === 'Full-Stack E-Commerce Platform', 'Project title matches authoritative catalog');
  assert(lookupData.customerEmail === undefined, 'Public lookup does not expose customer email PII');
  assert(lookupData.customerPhone === undefined, 'Public lookup does not expose customer phone PII');

  // 5. Payment Verification Security: Invalid Signature Rejection
  console.log('\n--- 5. Payment Verification Security ---');
  const invalidSigResp = await fetch(`${PROD_URL}/api/orders/${createData.orderId}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: createData.providerOrderId,
      razorpay_payment_id: 'pay_test_fake_payment_id',
      razorpay_signature: 'fake_invalid_forged_signature_hex_123456',
    }),
  });
  assert(invalidSigResp.status === 400, 'Invalid signature rejected with HTTP 400');
  const invalidSigJson = await invalidSigResp.json();
  assert(invalidSigJson.error.code === 'INVALID_SIGNATURE', 'Error code is INVALID_SIGNATURE');

  // 6. Provider order ID mismatch rejection
  const mismatchResp = await fetch(`${PROD_URL}/api/orders/${createData.orderId}/verify-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpay_order_id: 'order_mismatched_999999',
      razorpay_payment_id: 'pay_test_fake_payment_id',
      razorpay_signature: 'fake_signature',
    }),
  });
  assert(mismatchResp.status === 400, 'Mismatched provider order ID rejected with HTTP 400');

  console.log(`\n🎉 Production Live Verification Passed! (${passed} passed, ${failed} failed)\n`);
}

run().catch((err) => {
  console.error('\n💥 Production verification failed:', err);
  process.exit(1);
});
