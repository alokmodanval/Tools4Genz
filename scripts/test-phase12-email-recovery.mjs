import { readFileSync } from 'node:fs';
import worker from '../worker/src/index.ts';
import { ensurePurchaseReceipt } from '../worker/src/services/email/transactionalEmail.ts';
import {
  generateRecoveryToken,
  hashRecoveryValue,
  redeemPurchaseRecovery,
  requestPurchaseRecovery,
} from '../worker/src/services/purchaseRecovery.ts';
import { hashPurchaseAccessToken } from '../worker/src/utils/purchaseAccess.ts';

class MockEmailProvider {
  constructor() { this.name = 'mock'; this.messages = []; this.fail = false; this.ids = new Map(); }
  async send(message) {
    this.messages.push({ ...message });
    if (this.fail) throw new Error('mock provider unavailable');
    if (!this.ids.has(message.idempotencyKey)) this.ids.set(message.idempotencyKey, `msg_${this.ids.size + 1}`);
    return { provider: this.name, messageId: this.ids.get(message.idempotencyKey) };
  }
}

class MemoryStatement {
  constructor(db, sql) { this.db = db; this.sql = sql.replace(/\s+/g, ' ').trim(); this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return (await this.all()).results[0] || null; }
  async all() {
    const s = this.sql; const v = this.values;
    if (s.includes('FROM transactional_email_events')) {
      const row = this.db.emailEvents.find((item) => item.dedupe_key === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    if (s.includes('COUNT(*) AS c FROM purchase_recovery_requests')) {
      const rows = this.db.recoveryRequests.filter((item) => item.email_hash === v[0] && item.created_at >= v[1]);
      return { results: [{ c: rows.length }] };
    }
    if (s.includes('FROM purchase_recovery_requests')) {
      const rows = this.db.recoveryRequests.filter((item) => item.email_hash === v[0])
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return { results: rows.slice(0, 1).map((row) => ({ ...row })) };
    }
    if (s.includes('FROM purchase_recovery_tokens')) {
      const row = this.db.recoveryTokens.find((item) => item.token_hash === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    if (s.includes('FROM project_releases')) {
      let rows = [...this.db.releases];
      if (s.includes('WHERE id = ?')) rows = rows.filter((row) => row.id === v[0]);
      else if (s.includes("project_id = ? AND status = 'published'")) rows = rows.filter((row) => row.project_id === v[0] && row.status === 'published');
      return { results: rows.map((row) => ({ ...row })) };
    }
    if (s.includes('FROM digital_deliveries')) {
      let rows = [...this.db.deliveries];
      if (s.includes('WHERE order_id = ?')) rows = rows.filter((row) => row.order_id === v[0]);
      else if (s.includes('WHERE id = ?')) rows = rows.filter((row) => row.id === v[0]);
      return { results: rows.map((row) => ({ ...row })) };
    }
    if (s.includes('FROM admin_projects')) return { results: [] };
    if (s.includes('FROM orders')) {
      if (s.includes("LOWER(TRIM(customer_email)) = ? AND status = 'paid'")) {
        return { results: this.db.orders.filter((row) => row.customer_email.trim().toLowerCase() === v[0] && row.status === 'paid').map((row) => ({ ...row })) };
      }
      const row = s.includes('provider_order_id = ?')
        ? this.db.orders.find((item) => item.provider_order_id === v[0])
        : this.db.orders.find((item) => item.order_id === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    return { results: [] };
  }
  async run() {
    const s = this.sql; const v = this.values;
    if (s.startsWith('INSERT OR IGNORE INTO transactional_email_events')) {
      if (this.db.emailEvents.some((row) => row.dedupe_key === v[2])) return { meta: { changes: 0, last_row_id: 0 } };
      const row = { id: this.db.nextEmailId++, order_id: v[0], email_type: v[1], dedupe_key: v[2], provider: v[3], provider_message_id: null, status: 'processing', attempt_count: 1, last_error: null, created_at: v[4], sent_at: null, updated_at: v[5] };
      this.db.emailEvents.push(row); return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE transactional_email_events')) {
      const dedupe = v[v.length - 1]; const row = this.db.emailEvents.find((item) => item.dedupe_key === dedupe);
      if (!row) return { meta: { changes: 0, last_row_id: 0 } };
      if (s.includes("status = 'processing'")) {
        if (row.status !== 'failed') return { meta: { changes: 0, last_row_id: 0 } };
        row.status = 'processing'; row.attempt_count += 1; row.last_error = null; row.updated_at = v[0];
      } else if (s.includes("status = 'sent'")) {
        row.status = 'sent'; row.provider_message_id = v[0]; row.sent_at = v[1]; row.updated_at = v[2];
      } else {
        row.status = 'failed'; row.last_error = v[0]; row.updated_at = v[1];
      }
      return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('INSERT INTO purchase_recovery_requests')) {
      const row = { id: this.db.nextRequestId++, request_id: v[0], email_hash: v[1], status: v[2], created_at: v[3], updated_at: v[4] };
      this.db.recoveryRequests.push(row); return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE purchase_recovery_requests')) {
      const row = this.db.recoveryRequests.find((item) => item.request_id === v[2]);
      if (row) { row.status = v[0]; row.updated_at = v[1]; }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('INSERT INTO purchase_recovery_tokens')) {
      const row = { id: this.db.nextTokenId++, request_id: v[0], order_id: v[1], token_hash: v[2], expires_at: v[3], used_at: v[4], revoked_at: v[5], created_at: v[6] };
      this.db.recoveryTokens.push(row); return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE purchase_recovery_tokens')) {
      if (s.includes('WHERE id = ?')) {
        const row = this.db.recoveryTokens.find((item) => item.id === v[1]);
        if (!row || row.used_at || row.revoked_at || row.expires_at <= v[2]) return { meta: { changes: 0, last_row_id: 0 } };
        row.used_at = v[0]; return { meta: { changes: 1, last_row_id: row.id } };
      }
      const rows = this.db.recoveryTokens.filter((item) => item.request_id === v[1] && !item.used_at && !item.revoked_at);
      rows.forEach((row) => { row.revoked_at = v[0]; });
      return { meta: { changes: rows.length, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('access_token_hash = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[3]);
      if (row) { row.access_token_hash = v[0]; row.access_token_created_at = v[1]; row.updated_at = v[2]; }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('delivery_id = ?')) {
      const row = this.db.orders.find((item) => item.order_id === v[4]);
      if (row) { row.delivery_id = v[0]; row.delivery_status = v[1]; row.updated_at = v[3]; }
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE digital_deliveries')) {
      const row = this.db.deliveries.find((item) => item.id === v[v.length - 1]);
      if (!row) return { meta: { changes: 0, last_row_id: 0 } };
      if (s.includes('download_count = download_count + 1')) { row.download_count += 1; row.last_download_at = v[0]; row.updated_at = v[1]; }
      else {
        const assignments = (s.match(/SET (.+) WHERE id = \?/i)?.[1] || '').split(',').map((part) => part.trim()).filter((part) => !part.startsWith('updated_at'));
        assignments.forEach((assignment, index) => { row[assignment.split('=')[0].trim()] = v[index]; }); row.updated_at = v[v.length - 2];
      }
      return { meta: { changes: 1, last_row_id: 0 } };
    }
    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

class MemoryD1 {
  constructor() { this.orders = []; this.emailEvents = []; this.recoveryRequests = []; this.recoveryTokens = []; this.deliveries = []; this.releases = []; this.nextEmailId = 1; this.nextRequestId = 1; this.nextTokenId = 1; }
  prepare(sql) { return new MemoryStatement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

class MockKV {
  constructor() { this.objects = new Map(); }
  async getWithMetadata(key) { const item = this.objects.get(key); return item ? { value: item.bytes.buffer, metadata: item.metadata } : { value: null, metadata: null }; }
  async put() {} async delete() {}
}

const now = () => new Date().toISOString();
function order(orderId, email, status = 'paid') {
  return { id: Math.random(), order_id: orderId, project_id: 'ml-sentiment-analyzer', project_slug: 'ml-sentiment-analyzer', project_title: `Analyzer <${orderId}>`, customer_name: 'Buyer', customer_email: email, customer_phone: null, amount: 3999, currency: 'INR', status, payment_provider: 'razorpay', provider_order_id: `rzp_${orderId}`, provider_payment_id: status === 'paid' ? `pay_${orderId}` : null, provider_signature: 'hidden-signature', notes: null, paid_at: status === 'paid' ? now() : null, created_at: now(), updated_at: now(), access_token_hash: null, access_token_created_at: null, delivery_status: null };
}

async function main() {
  const db = new MemoryD1(); const provider = new MockEmailProvider();
  const env = { DB: db, EMAIL_PROVIDER: provider, SITE_URL: 'https://tools4genz.com' };
  let passed = 0; const check = (value, label) => { if (!value) throw new Error(`FAIL: ${label}`); passed += 1; console.log(`✅ ${passed}. ${label}`); };
  console.log('🧪 Phase 12 — Email Receipts & Purchase Recovery\n');

  const oldToken = `pt_${'A'.repeat(43)}`;
  const paid = order('TG-ORD-P12PAID', ' Buyer@Example.COM '); paid.access_token_hash = await hashPurchaseAccessToken(oldToken);
  const unpaid = order('TG-ORD-P12UNPAID', 'unpaid@example.com', 'payment_pending');
  const failed = order('TG-ORD-P12FAILED', 'failed@example.com', 'payment_failed');
  db.orders.push(paid, unpaid, failed);

  check(await ensurePurchaseReceipt(db, paid.order_id, env) === 'sent' && provider.messages.length === 1, 'Paid order triggers receipt');
  check(await ensurePurchaseReceipt(db, unpaid.order_id, env) === 'skipped', 'Unpaid order does not trigger receipt');
  check(await ensurePurchaseReceipt(db, failed.order_id, env) === 'skipped', 'Failed order does not trigger receipt');
  await ensurePurchaseReceipt(db, paid.order_id, env);
  check(provider.messages.length === 1, 'Duplicate webhook processing sends receipt only once');
  await ensurePurchaseReceipt(db, paid.order_id, env);
  check(provider.messages.length === 1 && db.emailEvents[0].attempt_count === 1, 'Direct verification plus webhook remains receipt-idempotent');

  const failOrder = order('TG-ORD-P12MAILFAIL', 'mailfail@example.com'); db.orders.push(failOrder); provider.fail = true;
  check(await ensurePurchaseReceipt(db, failOrder.order_id, env) === 'failed' && failOrder.status === 'paid', 'Email provider failure does not change paid status');
  provider.fail = false;
  const receipt = provider.messages[0];
  check(!receipt.html.includes(oldToken) && !receipt.text.includes(oldToken), 'Receipt excludes raw purchase token');
  check(!receipt.html.includes(paid.access_token_hash), 'Receipt excludes purchase token hash');
  check(!receipt.html.includes('projects/ml-sentiment-analyzer/'), 'Receipt excludes storage keys');

  const knownResponse = await worker.fetch(new Request('https://api.test/api/purchases/recovery/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'buyer@example.com' }) }), env);
  const knownText = await knownResponse.text();
  check(knownResponse.status === 202 && knownText.includes('If purchases are associated'), 'Known email receives generic recovery response');
  const unknownResponse = await worker.fetch(new Request('https://api.test/api/purchases/recovery/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'unknown@example.com' }) }), env);
  const unknownText = await unknownResponse.text();
  check(unknownResponse.status === 202 && unknownText === knownText, 'Unknown email receives identical generic response');

  const recoveryMessage = provider.messages.find((message) => message.idempotencyKey.startsWith('recovery:'));
  const recoveryToken = recoveryMessage.text.match(/rt_[A-Za-z0-9_-]{43}/)?.[0];
  check(/^rt_[A-Za-z0-9_-]{43}$/.test(generateRecoveryToken()) && /^rt_[A-Za-z0-9_-]{43}$/.test(recoveryToken), 'Recovery tokens have 256-bit URL-safe entropy');
  check(!JSON.stringify(db.recoveryTokens).includes(recoveryToken) && db.recoveryTokens[0].token_hash === await hashRecoveryValue(recoveryToken), 'Only recovery-token hash is stored');

  const expiredRaw = `rt_${'E'.repeat(43)}`;
  db.recoveryTokens.push({ id: db.nextTokenId++, request_id: 'expired', order_id: paid.order_id, token_hash: await hashRecoveryValue(expiredRaw), expires_at: new Date(Date.now() - 1000).toISOString(), used_at: null, revoked_at: null, created_at: now() });
  check((await redeemPurchaseRecovery(db, expiredRaw)).ok === false, 'Recovery token expiry is enforced');
  check((await redeemPurchaseRecovery(db, `rt_${'X'.repeat(43)}`)).reason === 'invalid', 'Invalid recovery token is rejected');
  check((await redeemPurchaseRecovery(db, expiredRaw)).reason === 'expired', 'Expired recovery token returns expired state');

  const redeemed = await redeemPurchaseRecovery(db, recoveryToken);
  check(redeemed.ok && /^pt_[A-Za-z0-9_-]{43}$/.test(redeemed.accessToken), 'Successful recovery creates a new purchase token');
  check((await redeemPurchaseRecovery(db, recoveryToken)).reason === 'used', 'Recovery token is one-time use');
  check(db.recoveryTokens[0].used_at !== null, 'Used recovery token is persisted as consumed');

  const oldAuth = await worker.fetch(new Request(`https://api.test/api/orders/${paid.order_id}`, { headers: { Authorization: `Purchase ${oldToken}` } }), env);
  check(oldAuth.status === 403, 'Old purchase token becomes invalid after recovery');
  const newAuth = await worker.fetch(new Request(`https://api.test/api/orders/${paid.order_id}`, { headers: { Authorization: `Purchase ${redeemed.accessToken}` } }), env);
  check(newAuth.status === 200, 'New purchase token authorizes the order');

  const key = 'projects/ml-sentiment-analyzer/releases/p12/release.zip'; const kv = new MockKV();
  const zip = new Uint8Array([0x50, 0x4b, 3, 4, 12]); kv.objects.set(key, { bytes: zip, metadata: { size: zip.length, sha256: '1'.repeat(64) } });
  db.releases.push({ id: 1, project_id: paid.project_id, version: 'p12', r2_key: key, filename: 'release.zip', content_type: 'application/zip', file_size: zip.length, sha256: '1'.repeat(64), status: 'published', created_at: now(), updated_at: now(), published_at: now(), storage_provider: 'kv' });
  db.deliveries.push({ id: 1, order_id: paid.order_id, project_id: paid.project_id, delivery_status: 'ready', delivery_key: key, download_count: 0, last_download_at: null, created_at: now(), updated_at: now(), file_size: zip.length, sha256: '1'.repeat(64), release_id: 1 }); paid.delivery_status = 'ready';
  const download = await worker.fetch(new Request(`https://api.test/api/orders/${paid.order_id}/download`, { headers: { Authorization: `Purchase ${redeemed.accessToken}` } }), { ...env, PROJECT_ASSETS: kv });
  check(download.status === 200, 'New purchase token authorizes paid download');
  check(!knownText.includes(recoveryToken), 'Recovery token never appears in public issuance response');
  check(!recoveryMessage.html.includes('pt_') && !recoveryMessage.text.includes('pt_'), 'Purchase token is never included in recovery email');

  const customerB = order('TG-ORD-P12B', 'other@example.com'); db.orders.push(customerB);
  await requestPurchaseRecovery(db, 'buyer@example.com', env); // cooldown: deliberately no second email
  check(!recoveryMessage.text.includes(customerB.order_id), 'Customer A cannot recover Customer B order');

  const normalizedOrder = order('TG-ORD-P12NORMAL', ' MixedCase@Example.Net '); db.orders.push(normalizedOrder);
  const normalized = await requestPurchaseRecovery(db, '  mixedcase@example.net  ', env);
  check(normalized.matchedOrders === 1 && normalized.emailStatus === 'sent', 'Email normalization matches safely');

  const multi1 = order('TG-ORD-P12M1', 'multi@example.com'); const multi2 = order('TG-ORD-P12M2', 'MULTI@example.com'); db.orders.push(multi1, multi2);
  const multi = await requestPurchaseRecovery(db, 'multi@example.com', env);
  const multiMessage = provider.messages.at(-1);
  check(multi.matchedOrders === 2 && multiMessage.text.includes(multi1.order_id) && multiMessage.text.includes(multi2.order_id), 'Multiple paid purchases receive separate secure recovery actions');

  const callsBeforeLimit = provider.messages.length;
  const limited = await requestPurchaseRecovery(db, 'multi@example.com', env);
  check(limited.limited && provider.messages.length === callsBeforeLimit, 'Per-email recovery cooldown prevents abuse');
  const limitedApi = await worker.fetch(new Request('https://api.test/api/purchases/recovery/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'multi@example.com' }) }), env);
  check((await limitedApi.text()) === knownText, 'Rate-limit response reveals no account existence');

  const failureProvider = new MockEmailProvider(); failureProvider.fail = true;
  const recoveryFailOrder = order('TG-ORD-P12RECFAIL', 'recovery-fail@example.com'); db.orders.push(recoveryFailOrder);
  const failureResult = await requestPurchaseRecovery(db, recoveryFailOrder.customer_email, { ...env, EMAIL_PROVIDER: failureProvider });
  const failedRecoveryEvent = db.emailEvents.find((event) => event.email_type === 'recovery' && event.status === 'failed');
  check(failureResult.emailStatus === 'failed' && failedRecoveryEvent?.last_error, 'Recovery email failure is safely persisted');
  check(db.emailEvents.find((event) => event.order_id === failOrder.order_id).status === 'failed', 'Receipt provider failure state is persisted for retry');
  provider.fail = false; await ensurePurchaseReceipt(db, failOrder.order_id, env); await ensurePurchaseReceipt(db, failOrder.order_id, env);
  const retriedEvent = db.emailEvents.find((event) => event.order_id === failOrder.order_id);
  check(retriedEvent.status === 'sent' && retriedEvent.attempt_count === 2 && provider.ids.has(`receipt:${failOrder.order_id}`), 'Receipt idempotency survives failed processing and duplicate retry');

  check(!knownText.includes('mock') && !knownText.includes('provider'), 'Public customer API exposes no email-provider internals');
  const admin = await worker.fetch(new Request('https://api.test/api/admin/recovery-tokens'), env);
  check(admin.status === 401 && !JSON.stringify(await admin.json()).includes('rt_'), 'Admin APIs expose no raw recovery token');

  const pageSource = readFileSync('src/pages/PurchaseRecoveryPage.tsx', 'utf8');
  check(pageSource.indexOf('history.replaceState') < pageSource.indexOf('purchaseRecoveryService.redeem'), 'Recovery page removes fragment before redemption or normal usage');
  const queryOnly = await worker.fetch(new Request(`https://api.test/api/purchases/recovery/redeem?token=${recoveryToken}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), env);
  check(queryOnly.status === 400 && !pageSource.includes('location.search'), 'Recovery token query parameters are unsupported');
  check(!JSON.stringify(db.emailEvents).includes(recoveryToken) && !JSON.stringify(db.recoveryRequests).includes('buyer@example.com'), 'Email events store neither raw recovery token nor raw recovery email');
  check(recoveryMessage.html.includes('&lt;TG-ORD-P12PAID&gt;'), 'Dynamic HTML content is escaped safely');

  console.log(`\n🎉 Phase 12 Email Recovery Suite: ${passed}/${passed} passed`);
}

main().catch((error) => { console.error('\n💥 Phase 12 Tests Failed:', error); process.exit(1); });
