import worker from '../worker/src/index.ts';
import { hashPurchaseAccessToken } from '../worker/src/utils/purchaseAccess.ts';

class MemoryStatement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return (await this.all()).results[0] || null; }
  async all() {
    const s = this.sql;
    const v = this.values;
    if (s.includes('FROM admin_projects')) return { results: [] };
    if (s.includes('FROM project_releases')) {
      let rows = [...this.db.releases];
      if (s.includes('WHERE id = ?')) rows = rows.filter((row) => row.id === v[0]);
      else if (s.includes("project_id = ? AND status = 'published'")) {
        rows = rows.filter((row) => row.project_id === v[0] && row.status === 'published');
      }
      return { results: rows.map((row) => ({ ...row })) };
    }
    if (s.includes('FROM digital_deliveries')) {
      let rows = [...this.db.deliveries];
      if (s.includes('WHERE order_id = ?')) rows = rows.filter((row) => row.order_id === v[0]);
      else if (s.includes('WHERE id = ?')) rows = rows.filter((row) => row.id === v[0]);
      return { results: rows.map((row) => ({ ...row })) };
    }
    if (s.includes('FROM orders')) {
      let row = null;
      if (s.includes('provider_order_id = ?')) row = this.db.orders.find((item) => item.provider_order_id === v[0]);
      else row = this.db.orders.find((item) => item.order_id === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    return { results: [] };
  }
  async run() {
    const s = this.sql;
    const v = this.values;
    if (s.startsWith('INSERT INTO orders')) {
      const row = {
        id: this.db.nextOrderId++, order_id: v[0], project_id: v[1], project_slug: v[2], project_title: v[3],
        customer_name: v[4], customer_email: v[5], customer_phone: v[6], amount: v[7], currency: v[8],
        status: v[9], payment_provider: v[10], provider_order_id: v[11], provider_payment_id: v[12],
        provider_signature: v[13], notes: v[14], paid_at: v[15], created_at: v[16], updated_at: v[17],
        access_token_hash: v[18], access_token_created_at: v[19], delivery_id: null, delivery_status: null,
      };
      this.db.orders.push(row);
      return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('provider_order_id = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[3]);
      if (row) { row.provider_order_id = v[0]; row.status = v[1]; row.updated_at = v[2]; }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes("status = 'paid'")) {
      const row = this.db.orders.find((item) => item.order_id === v[4]);
      if (row) {
        row.status = 'paid'; row.provider_payment_id = v[0]; row.provider_signature = v[1];
        row.paid_at = v[2]; row.updated_at = v[3];
      }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('qr_id = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[6]);
      if (row) {
        row.qr_id = v[0]; row.qr_image_url = v[1]; row.qr_status = v[2]; row.qr_close_by = v[3];
        row.qr_created_at = v[4]; row.updated_at = v[5];
      }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('delivery_id = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[4]);
      if (row) {
        const delivery = this.db.deliveries.find((item) => item.id === v[0]);
        row.delivery_id = v[0]; row.delivery_status = v[1]; row.delivery_project_id = delivery?.project_id || null;
        row.updated_at = v[3];
      }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('SET status = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[3]);
      if (row) { row.status = v[0]; row.notes = v[1] || row.notes; row.updated_at = v[2]; }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('INSERT INTO digital_deliveries')) {
      const row = {
        id: this.db.nextDeliveryId++, order_id: v[0], project_id: v[1], delivery_status: v[2],
        delivery_key: v[3], download_count: v[4], last_download_at: v[5], created_at: v[6],
        updated_at: v[7], file_size: v[8], sha256: v[9], release_id: v[10],
      };
      this.db.deliveries.push(row);
      return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE digital_deliveries')) {
      const row = this.db.deliveries.find((item) => item.id === v[v.length - 1]);
      if (!row) return { meta: { changes: 0, last_row_id: 0 } };
      if (s.includes('download_count = download_count + 1')) {
        row.download_count += 1; row.last_download_at = v[0]; row.updated_at = v[1];
      } else {
        const setText = s.match(/SET (.+) WHERE id = \?/i)?.[1] || '';
        const assignments = setText.split(',').map((part) => part.trim()).filter((part) => !part.startsWith('updated_at'));
        assignments.forEach((assignment, index) => { row[assignment.split('=')[0].trim()] = v[index]; });
        row.updated_at = v[v.length - 2];
      }
      return { meta: { changes: 1, last_row_id: 0 } };
    }
    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

class MemoryD1 {
  constructor() { this.orders = []; this.deliveries = []; this.releases = []; this.nextOrderId = 1; this.nextDeliveryId = 1; }
  prepare(sql) { return new MemoryStatement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

class MockKV {
  constructor() { this.objects = new Map(); this.lastGetKey = null; }
  async put(key, bytes, options = {}) { this.objects.set(key, { bytes: new Uint8Array(bytes), metadata: options.metadata || null }); }
  async getWithMetadata(key) {
    this.lastGetKey = key;
    const item = this.objects.get(key);
    return item
      ? { value: item.bytes.buffer.slice(item.bytes.byteOffset, item.bytes.byteOffset + item.bytes.byteLength), metadata: item.metadata }
      : { value: null, metadata: null };
  }
  async delete(key) { this.objects.delete(key); }
}

const auth = (token) => ({ Authorization: `Purchase ${token}` });
const createRequest = (email) => new Request('https://api.test/api/orders', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: 'ml-sentiment-analyzer', customerName: 'Phase Eleven Buyer', customerEmail: email }),
});

async function hmac(orderId, paymentId, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${orderId}|${paymentId}`));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function main() {
  const originalConsole = { log: console.log, warn: console.warn, error: console.error };
  const capturedLogs = [];
  for (const level of ['log', 'warn', 'error']) {
    console[level] = (...args) => {
      capturedLogs.push(args.map((value) => String(value)).join(' '));
      originalConsole[level](...args);
    };
  }
  const db = new MemoryD1();
  const kv = new MockKV();
  const secret = 'phase11-test-secret';
  const env = { DB: db, PROJECT_ASSETS: kv, RAZORPAY_KEY_ID: 'rzp_test_placeholder', RAZORPAY_KEY_SECRET: secret, PURCHASE_AVAILABILITY_BYPASS: 'test-only' };
  let passed = 0;
  const check = (condition, label) => { if (!condition) throw new Error(`FAIL: ${label}`); passed += 1; console.log(`✅ ${passed}. ${label}`); };
  const capturedPublicBodies = [];

  console.log('🧪 Phase 11 — Secure Purchase Access\n');

  const createAResponse = await worker.fetch(createRequest('buyer-a@example.com'), env);
  const createAJson = await createAResponse.json();
  const orderA = createAJson.data;
  const createBResponse = await worker.fetch(createRequest('buyer-b@example.com'), env);
  const createBJson = await createBResponse.json();
  const orderB = createBJson.data;
  check(createAResponse.status === 201 && /^pt_[A-Za-z0-9_-]{43}$/.test(orderA.accessToken), 'Order creation returns a 256-bit URL-safe access token');
  check(orderA.accessToken !== orderB.accessToken, 'Access tokens differ between orders');
  check(!JSON.stringify(db.orders).includes(orderA.accessToken), 'Raw access token is not stored in D1');
  check(db.orders[0].access_token_hash.length === 64 && db.orders[0].access_token_hash === await hashPurchaseAccessToken(orderA.accessToken), 'D1 stores the SHA-256 token hash');

  const noTokenStatus = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}`), env);
  check(noTokenStatus.status === 401, 'Order lookup without token is rejected');
  const wrongToken = `pt_${'Z'.repeat(43)}`;
  const wrongStatus = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}`, { headers: auth(wrongToken) }), env);
  check(wrongStatus.status === 403, 'Order lookup with wrong token is rejected');
  const validStatus = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}`, { headers: auth(orderA.accessToken) }), env);
  const validStatusText = await validStatus.text(); capturedPublicBodies.push(validStatusText);
  check(validStatus.status === 200, 'Order lookup with valid token succeeds');

  const noTokenDownload = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`), env);
  check(noTokenDownload.status === 401, 'Download without token is rejected');
  const wrongDownload = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`, { headers: auth(wrongToken) }), env);
  check(wrongDownload.status === 403, 'Download with wrong token is rejected');
  const unpaidDownload = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`, { headers: auth(orderA.accessToken) }), env);
  check(unpaidDownload.status === 402 && (await unpaidDownload.json()).error.code === 'PAYMENT_REQUIRED', 'Correct token cannot bypass unpaid status');

  const paymentId = 'pay_phase11_a';
  const signature = await hmac(orderA.providerOrderId, paymentId, secret);
  const verified = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/verify-payment`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ razorpay_order_id: orderA.providerOrderId, razorpay_payment_id: paymentId, razorpay_signature: signature }),
  }), env);
  check(verified.status === 200 && (await verified.json()).data.status === 'paid', 'Existing payment verification still succeeds');
  const pendingDownload = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`, { headers: auth(orderA.accessToken) }), env);
  check(pendingDownload.status === 409 && (await pendingDownload.json()).error.code === 'DELIVERY_NOT_READY', 'Paid pending delivery returns DELIVERY_NOT_READY');

  const publicJson = JSON.parse(validStatusText);
  check(publicJson.data.accessToken === undefined, 'Customer order response never returns the raw token');
  check(publicJson.data.access_token_hash === undefined && publicJson.data.accessTokenHash === undefined, 'Customer order response never returns the token hash');
  const adminProbe = await worker.fetch(new Request('https://api.test/api/admin/orders'), env);
  check(adminProbe.status === 401 && !JSON.stringify(await adminProbe.json()).includes('access_token'), 'Admin API does not expose purchase token material');
  const queryToken = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}?token=${orderA.accessToken}`), env);
  check(queryToken.status === 401, 'Token supplied in an arbitrary query parameter is ignored');
  const namedQueryToken = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}?accessToken=${orderA.accessToken}`), env);
  check(namedQueryToken.status === 401, 'Purchase tokens in query strings are not supported');
  check(db.orders[0].access_token_hash !== db.orders[1].access_token_hash, 'Multiple orders retain isolated token hashes');
  const crossOrder = await worker.fetch(new Request(`https://api.test/api/orders/${orderB.orderId}`, { headers: auth(orderA.accessToken) }), env);
  check(crossOrder.status === 403, 'Token from order A cannot access order B');

  const qr = await worker.fetch(new Request(`https://api.test/api/orders/${orderB.orderId}/payment/qr`, { method: 'POST' }), env);
  check(qr.status === 201 && (await qr.json()).data.amount === orderB.amount, 'Existing QR flow remains server-authoritative');

  const releaseKey = 'projects/ml-sentiment-analyzer/releases/phase11/release.zip';
  const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 11, 12, 13]);
  await kv.put(releaseKey, zipBytes.buffer, { metadata: { size: zipBytes.byteLength, sha256: 'a'.repeat(64) } });
  db.releases.push({
    id: 1, project_id: 'ml-sentiment-analyzer', version: 'phase11', r2_key: releaseKey,
    filename: 'release.zip', content_type: 'application/zip', file_size: zipBytes.byteLength,
    sha256: 'a'.repeat(64), status: 'published', storage_provider: 'kv', created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(), published_at: new Date().toISOString(),
  });
  const readyPoll = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}`, { headers: auth(orderA.accessToken) }), env);
  const readyPollText = await readyPoll.text(); capturedPublicBodies.push(readyPollText);
  check(readyPoll.status === 200 && JSON.parse(readyPollText).data.deliveryStatus === 'ready', 'Authorized delivery polling promotes an available release to ready');
  const delivery = db.deliveries.find((item) => item.order_id === orderA.orderId);
  const countBeforeWrong = delivery.download_count;
  await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`, { headers: auth(wrongToken) }), env);
  check(delivery.download_count === countBeforeWrong, 'Wrong token does not increment download_count');
  const readyDownload = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download`, { headers: auth(orderA.accessToken) }), env);
  const downloaded = new Uint8Array(await readyDownload.arrayBuffer());
  check(readyDownload.status === 200 && downloaded.every((byte, index) => byte === zipBytes[index]), 'Correct token downloads the ready private ZIP');
  check(delivery.download_count === countBeforeWrong + 1 && delivery.last_download_at, 'Successful download increments count and timestamp server-side');
  const tamperedKey = await worker.fetch(new Request(`https://api.test/api/orders/${orderA.orderId}/download?key=evil.zip`, { headers: auth(orderA.accessToken) }), env);
  check(tamperedKey.status === 200 && kv.lastGetKey === releaseKey, 'Arbitrary object-key query input is ignored');

  db.orders.push({ ...db.orders[1], id: 999, order_id: 'TG-ORD-LEGACY11', access_token_hash: null, access_token_created_at: null });
  const legacy = await worker.fetch(new Request('https://api.test/api/orders/TG-ORD-LEGACY11', { headers: auth(orderB.accessToken) }), env);
  check(legacy.status === 403 && (await legacy.json()).error.code === 'PURCHASE_ACCESS_UNAVAILABLE', 'Legacy order cannot silently fall back to order-ID authorization');
  const unknown = await worker.fetch(new Request('https://api.test/api/orders/TG-ORD-UNKNOWN11', { headers: auth(orderA.accessToken) }), env);
  check(unknown.status === 404, 'Unknown order still returns 404');
  check(capturedPublicBodies.every((body) => !body.includes(orderA.accessToken) && !body.includes(db.orders[0].access_token_hash)), 'Raw token and hash are absent from serialized customer responses');
  check(capturedLogs.every((line) => !line.includes(orderA.accessToken) && !line.includes(orderB.accessToken)), 'Raw purchase tokens are absent from logs');

  console.log(`\n🎉 Phase 11 Purchase Access Suite: ${passed}/${passed} passed`);
  Object.assign(console, originalConsole);
}

main().catch((error) => { console.error('\n💥 Phase 11 Tests Failed:', error); process.exit(1); });
