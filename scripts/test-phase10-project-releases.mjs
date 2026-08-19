import worker from '../worker/src/index.ts';
import {
  handleArchiveProjectRelease,
  handleGetProjectReleases,
  handlePublishProjectRelease,
  handleUploadProjectRelease,
} from '../worker/src/routes/admin.ts';
import { handleDownloadDelivery } from '../worker/src/routes/orders.ts';
import { projectReleaseRepository } from '../worker/src/db/repository.ts';
import { prepareDelivery } from '../worker/src/services/delivery.ts';
import { computeReleaseSha256 } from '../worker/src/services/projectReleases.ts';
import { hashPurchaseAccessToken } from '../worker/src/utils/purchaseAccess.ts';

const TEST_PURCHASE_TOKEN = `pt_${'C'.repeat(43)}`;
let testPurchaseHash = '';

class MemoryStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql.replace(/\s+/g, ' ').trim();
    this.values = [];
  }
  bind(...values) { this.values = values; return this; }
  async first() { return (await this.all()).results[0] || null; }
  async all() {
    const s = this.sql;
    const v = this.values;
    if (s.includes('FROM admin_projects')) {
      const row = this.db.adminProjects.find((item) => item.id === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    if (s.includes('FROM project_releases')) {
      let rows = [...this.db.releases];
      if (s.includes('WHERE id = ?')) rows = rows.filter((r) => r.id === v[0]);
      else if (s.includes("project_id = ? AND status = 'published'")) {
        rows = rows.filter((r) => r.project_id === v[0] && r.status === 'published');
      } else if (s.includes('project_id = ? AND version = ?')) {
        rows = rows.filter((r) => r.project_id === v[0] && r.version === v[1]);
      } else if (s.includes('WHERE project_id = ?')) rows = rows.filter((r) => r.project_id === v[0]);
      return { results: rows.map((r) => ({ ...r })) };
    }
    if (s.includes('FROM digital_deliveries')) {
      let rows = [...this.db.deliveries];
      if (s.includes('WHERE order_id = ?')) rows = rows.filter((r) => r.order_id === v[0]);
      else if (s.includes('WHERE id = ?')) rows = rows.filter((r) => r.id === v[0]);
      return { results: rows.map((r) => ({ ...r })) };
    }
    if (s.includes('FROM orders')) {
      const row = this.db.orders.find((item) => item.order_id === v[0]);
      return { results: row ? [{ ...row }] : [] };
    }
    return { results: [] };
  }
  async run() {
    const s = this.sql;
    const v = this.values;
    if (s.startsWith('INSERT INTO project_releases')) {
      let row = this.db.releases.find((r) => r.project_id === v[0] && r.version === v[1]);
      if (!row) {
        row = { id: this.db.nextReleaseId++, project_id: v[0], version: v[1], created_at: v[8] };
        this.db.releases.push(row);
      }
      Object.assign(row, {
        r2_key: v[2], filename: v[3], content_type: v[4], file_size: v[5], sha256: v[6],
        status: 'ready', updated_at: v[9], published_at: null, storage_provider: v[11] || 'kv',
      });
      return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE project_releases')) {
      if (s.includes("status = 'archived'") && s.includes('project_id = ?')) {
        for (const row of this.db.releases) {
          if (row.project_id === v[1] && row.status === 'published' && row.id !== v[2]) {
            row.status = 'archived'; row.updated_at = v[0];
          }
        }
        return { meta: { changes: 1, last_row_id: 0 } };
      }
      if (s.includes("status = 'published'")) {
        const row = this.db.releases.find((r) => r.id === v[2]);
        if (row && ['ready', 'published'].includes(row.status)) {
          row.status = 'published'; row.published_at = v[0]; row.updated_at = v[1];
          return { meta: { changes: 1, last_row_id: 0 } };
        }
      }
      if (s.includes("status = 'archived'") && s.includes('WHERE id = ?')) {
        const row = this.db.releases.find((r) => r.id === v[1]);
        if (row) { row.status = 'archived'; row.updated_at = v[0]; }
        return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
      }
    }
    if (s.startsWith('INSERT INTO digital_deliveries')) {
      const row = {
        id: this.db.nextDeliveryId++, order_id: v[0], project_id: v[1], delivery_status: v[2],
        delivery_key: v[3], download_count: v[4], last_download_at: v[5], created_at: v[6],
        updated_at: v[7], file_size: v[8], sha256: v[9], release_id: v[10] ?? null,
      };
      this.db.deliveries.push(row);
      return { meta: { changes: 1, last_row_id: row.id } };
    }
    if (s.startsWith('UPDATE digital_deliveries')) {
      const id = v[v.length - 1];
      const row = this.db.deliveries.find((d) => d.id === id);
      if (!row) return { meta: { changes: 0, last_row_id: 0 } };
      if (s.includes('download_count = download_count + 1')) {
        row.download_count += 1; row.last_download_at = v[0]; row.updated_at = v[1];
        return { meta: { changes: 1, last_row_id: 0 } };
      }
      const setText = s.match(/SET (.+) WHERE id = \?/i)?.[1] || '';
      const assignments = setText.split(',').map((part) => part.trim()).filter((part) => !part.startsWith('updated_at'));
      let index = 0;
      for (const assignment of assignments) {
        const field = assignment.split('=')[0].trim();
        row[field] = v[index++];
      }
      row.updated_at = v[v.length - 2];
      return { meta: { changes: 1, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE orders') && s.includes('delivery_id = ?')) {
      const order = this.db.orders.find((o) => o.order_id === v[4]);
      if (order) {
        const delivery = this.db.deliveries.find((d) => d.id === v[0]);
        order.delivery_id = v[0]; order.delivery_status = v[1];
        order.delivery_project_id = delivery?.project_id || null; order.updated_at = v[3];
      }
      return { meta: { changes: order ? 1 : 0, last_row_id: 0 } };
    }
    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

class MemoryD1 {
  constructor() {
    this.adminProjects = [];
    this.releases = [];
    this.deliveries = [];
    this.orders = [];
    this.nextReleaseId = 1;
    this.nextDeliveryId = 1;
  }
  prepare(sql) { return new MemoryStatement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

class MockKV {
  constructor() { this.objects = new Map(); this.putCalls = []; this.headCalls = []; this.getCalls = []; this.failNextPut = false; }
  async put(key, value, options = {}) {
    if (this.failNextPut) { this.failNextPut = false; throw new Error('simulated KV write failure'); }
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer);
    this.objects.set(key, { bytes, metadata: options.metadata || null }); this.putCalls.push({ key, options });
  }
  async getWithMetadata(key) {
    this.getCalls.push(key); const entry = this.objects.get(key);
    return entry
      ? { value: entry.bytes.buffer.slice(entry.bytes.byteOffset, entry.bytes.byteOffset + entry.bytes.byteLength), metadata: entry.metadata }
      : { value: null, metadata: null };
  }
  async delete(key) { this.objects.delete(key); }
}

const now = () => new Date().toISOString();
const projectRow = (id) => ({ id, slug: id, title: id, category: 'ai-projects', status: 'available', featured: 0, data: '{}', created_at: now(), updated_at: now() });
const orderRow = (orderId, projectId, status = 'paid') => ({
  id: Math.random(), order_id: orderId, project_id: projectId, project_slug: projectId,
  project_title: projectId, customer_name: 'Buyer', customer_email: 'buyer@example.com', customer_phone: null,
  amount: 3999, currency: 'INR', status, payment_provider: 'razorpay', provider_order_id: `rzp_${orderId}`,
  provider_payment_id: status === 'paid' ? `pay_${orderId}` : null, provider_signature: null, notes: null,
  paid_at: status === 'paid' ? now() : null, created_at: now(), updated_at: now(),
  access_token_hash: testPurchaseHash, access_token_created_at: now(),
});
const uploadRequest = (url, version, name, type, bytes, extra = {}) => {
  const form = new FormData();
  form.set('version', version);
  form.set('file', new Blob([bytes], { type }), name);
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return new Request(url, { method: 'POST', body: form });
};

async function main() {
  testPurchaseHash = await hashPurchaseAccessToken(TEST_PURCHASE_TOKEN);
  const db = new MemoryD1();
  const bucket = new MockKV();
  const env = { DB: db, PROJECT_ASSETS: bucket, ALLOWED_ORIGINS: 'https://tools4genz.com' };
  const projectId = 'ml-sentiment-analyzer';
  db.adminProjects.push(projectRow(projectId), projectRow('no-release'), projectRow('missing-object'));
  const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
  let passed = 0;
  const check = (condition, label) => {
    if (!condition) throw new Error(`FAIL: ${label}`);
    passed += 1; console.log(`✅ ${passed}. ${label}`);
  };

  console.log('🧪 Phase 10 — Project Releases\n');
  const unauth = await worker.fetch(uploadRequest(`https://api.test/api/admin/projects/${projectId}/releases`, 'v1', 'release.zip', 'application/zip', zipBytes), env);
  check(unauth.status === 401, 'Admin authentication is required for upload');

  const unknown = await handleUploadProjectRelease(uploadRequest('https://api.test', 'v1', 'release.zip', 'application/zip', zipBytes), 'unknown-project', db, env);
  check(unknown.status === 404, 'Unknown project is rejected');

  const unsafe = await handleUploadProjectRelease(uploadRequest('https://api.test', 'v1', 'payload.txt', 'text/plain', zipBytes), projectId, db, env);
  check(unsafe.status === 415, 'Unsafe file type is rejected');

  const oversizedRequest = uploadRequest('https://api.test', 'huge', 'huge.zip', 'application/zip', zipBytes);
  oversizedRequest.headers.set('content-length', String(26 * 1024 * 1024));
  const oversized = await handleUploadProjectRelease(oversizedRequest, projectId, db, env);
  check(oversized.status === 413, 'Upload above the safe KV limit is rejected');

  const uploaded = await handleUploadProjectRelease(uploadRequest('https://api.test', 'v1', 'source.zip', 'application/zip', zipBytes, { r2_key: 'evil/public.zip' }), projectId, db, env);
  const uploadedJson = await uploaded.json();
  check(bucket.putCalls[0].key === `projects/${projectId}/releases/v1/release.zip`, 'Storage key is generated server-side');
  check(!JSON.stringify(uploadedJson).includes('evil/public.zip'), 'Arbitrary storage key input is ignored and not exposed');
  check(db.releases.length === 1 && db.releases[0].sha256.length === 64, 'Release metadata and SHA-256 are stored in D1');
  check(db.releases[0].sha256 === await computeReleaseSha256(zipBytes.buffer), 'Stored SHA-256 matches uploaded binary');

  const releaseV1 = db.releases[0];
  await handlePublishProjectRelease(projectId, releaseV1.id, db, env);
  check((await projectReleaseRepository.findPublishedByProjectId(db, projectId))?.id === releaseV1.id, 'Published release is found by project ID');

  db.orders.push(orderRow('TG-ORD-P10A', projectId));
  const deliveryA = await prepareDelivery(db, 'TG-ORD-P10A', env);
  check(deliveryA?.release_id === releaseV1.id, 'Paid order resolves the published release');

  db.orders.push(orderRow('TG-ORD-UNPAID', projectId, 'payment_pending'));
  const unpaid = await handleDownloadDelivery(
    new Request('https://api.test/api/orders/TG-ORD-UNPAID/download', {
      headers: { Authorization: `Purchase ${TEST_PURCHASE_TOKEN}` },
    }),
    'TG-ORD-UNPAID', db, env
  );
  check(unpaid.status === 402, 'Unpaid order cannot download');

  db.orders.push(orderRow('TG-ORD-NORELEASE', 'no-release'));
  const noRelease = await prepareDelivery(db, 'TG-ORD-NORELEASE', env);
  check(noRelease?.delivery_status === 'pending' && !noRelease.release_id, 'Missing release leaves delivery pending');

  const missingKey = 'projects/missing-object/releases/v1/release.zip';
  const missingRelease = await projectReleaseRepository.saveAsset(db, {
    project_id: 'missing-object', version: 'v1', r2_key: missingKey, filename: 'release.zip', content_type: 'application/zip',
    file_size: 8, sha256: '0'.repeat(64), status: 'ready', created_at: now(), updated_at: now(), published_at: null,
    storage_provider: 'kv',
  });
  const missingPublish = await handlePublishProjectRelease('missing-object', missingRelease.id, db, env);
  check(missingPublish.status === 409, 'Publishing requires an existing KV value');
  await projectReleaseRepository.publish(db, missingRelease);
  db.orders.push(orderRow('TG-ORD-MISSINGOBJ', 'missing-object'));
  const missingObjectDelivery = await prepareDelivery(db, 'TG-ORD-MISSINGOBJ', env);
  check(missingObjectDelivery?.delivery_status === 'pending', 'Missing KV object leaves delivery pending');

  check(deliveryA?.delivery_status === 'ready', 'Existing private KV release sets delivery ready');

  db.orders.push(orderRow('TG-ORD-P10B', projectId));
  const deliveryB = await prepareDelivery(db, 'TG-ORD-P10B', env);
  check(deliveryB?.release_id === deliveryA?.release_id, 'Multiple orders share the same release record');
  check(deliveryB?.delivery_key === deliveryA?.delivery_key && !deliveryB?.delivery_key.includes('TG-ORD-P10B'), 'No per-order ZIP duplication is required');

  const download = await handleDownloadDelivery(
    new Request('https://api.test/api/orders/TG-ORD-P10A/download', {
      headers: { Authorization: `Purchase ${TEST_PURCHASE_TOKEN}` },
    }),
    'TG-ORD-P10A', db, env
  );
  const counted = db.deliveries.find((d) => d.order_id === 'TG-ORD-P10A');
  check(download.status === 200 && counted.download_count === 1, 'Secure download increments download_count');
  const downloadedBytes = new Uint8Array(await download.arrayBuffer());
  check(downloadedBytes.every((byte, index) => byte === zipBytes[index]), 'Downloaded binary matches uploaded KV binary');

  const tamperedDownload = await worker.fetch(
    new Request('https://api.test/api/orders/TG-ORD-P10B/download?key=evil/public.zip', {
      headers: { Authorization: `Purchase ${TEST_PURCHASE_TOKEN}` },
    }),
    env
  );
  check(tamperedDownload.status === 200 && bucket.getCalls.at(-1) === releaseV1.r2_key, 'Arbitrary key query is ignored');

  await handleArchiveProjectRelease(projectId, releaseV1.id, db);
  check((await projectReleaseRepository.findPublishedByProjectId(db, projectId)) === null, 'Archived release is not selected for new orders');

  await handleUploadProjectRelease(uploadRequest('https://api.test', 'v2', 'source-v2.zip', 'application/zip', zipBytes), projectId, db, env);
  const releaseV2 = db.releases.find((r) => r.version === 'v2');
  await handlePublishProjectRelease(projectId, releaseV2.id, db, env);
  db.orders.push(orderRow('TG-ORD-P10C', projectId));
  const deliveryC = await prepareDelivery(db, 'TG-ORD-P10C', env);
  check(deliveryC?.release_id === releaseV2.id, 'New published version is used for new deliveries');

  const stableA = await prepareDelivery(db, 'TG-ORD-P10A', env);
  check(stableA?.release_id === releaseV1.id, 'Existing valid delivery remains pinned to its original release');

  const listResponse = await handleGetProjectReleases(projectId, db);
  const listText = JSON.stringify(await listResponse.json());
  check(!listText.includes('r2_key') && !listText.includes('PROJECT_ASSETS'), 'Admin release response leaks no internal key or secret');
  check(!listText.includes('http://') && !listText.includes('https://') && download.headers.get('Cache-Control') === 'private, no-store', 'No public storage URL is exposed');

  bucket.failNextPut = true;
  const failedWrite = await handleUploadProjectRelease(uploadRequest('https://api.test', 'v3', 'failed.zip', 'application/zip', zipBytes), projectId, db, env);
  check(failedWrite.status === 502 && !db.releases.some((release) => release.version === 'v3'), 'KV write failure is handled without a false release');

  console.log(`\n🎉 Phase 10 Project Release Suite: ${passed}/${passed} passed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
