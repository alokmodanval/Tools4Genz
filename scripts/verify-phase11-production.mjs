import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const API = 'https://tools4genz-api.alokmodanwal940.workers.dev';
const KV_NAMESPACE = '173c5c232cb949128213322785737d76';
const WRANGLER_CONFIG = 'worker/wrangler.toml';

function wrangler(args, capture = false) {
  return execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'ignore', 'pipe'],
  });
}

function d1(sql, json = false) {
  return wrangler([
    'd1', 'execute', 'tools4genz-db', '--config', WRANGLER_CONFIG,
    '--remote', '--command', sql, ...(json ? ['--json'] : []),
  ], json);
}

function purchaseRequest(url, token) {
  return new Request(url, { headers: { Authorization: `Purchase ${token}` } });
}

const stamp = Date.now();
const version = `phase11-e2e-${stamp}`;
const storageKey = `projects/ml-sentiment-analyzer/releases/${version}/release.zip`;
const content = `PK-PHASE11-PRODUCTION-E2E-${stamp}`;
const bytes = new TextEncoder().encode(content);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const now = new Date().toISOString();
let orderId = '';
let accessToken = '';
let kvCreated = false;

try {
  const health = await fetch(`${API}/api/health`);
  if (health.status !== 200) throw new Error(`Health check returned ${health.status}`);

  const createResponse = await fetch(`${API}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: 'ml-sentiment-analyzer',
      customerName: 'Phase 11 Production E2E',
      customerEmail: `phase11-e2e-${stamp}@example.invalid`,
    }),
  });
  if (createResponse.status !== 201) throw new Error(`Order creation returned ${createResponse.status}`);
  const createJson = await createResponse.json();
  orderId = createJson.data.orderId;
  accessToken = createJson.data.accessToken;
  if (!/^pt_[A-Za-z0-9_-]{43}$/.test(accessToken)) throw new Error('Production token entropy/format check failed');

  const unauthorized = await fetch(`${API}/api/orders/${encodeURIComponent(orderId)}`);
  if (unauthorized.status !== 401) throw new Error(`Unauthorized lookup returned ${unauthorized.status}`);

  const authorized = await fetch(purchaseRequest(`${API}/api/orders/${encodeURIComponent(orderId)}`, accessToken));
  const authorizedText = await authorized.text();
  if (authorized.status !== 200) throw new Error(`Authorized lookup returned ${authorized.status}`);
  if (authorizedText.includes(accessToken) || authorizedText.includes('access_token_hash')) {
    throw new Error('Authorized customer response leaked token material');
  }

  const metadata = JSON.stringify({
    size: bytes.byteLength,
    contentType: 'application/zip',
    sha256,
    projectId: 'ml-sentiment-analyzer',
    version,
  });
  wrangler([
    'kv', 'key', 'put', storageKey, content,
    '--namespace-id', KV_NAMESPACE, '--remote', '--metadata', metadata,
  ]);
  kvCreated = true;

  d1(`
    INSERT INTO project_releases
      (project_id, version, r2_key, filename, content_type, file_size, sha256,
       status, created_at, updated_at, published_at, storage_provider)
    VALUES
      ('ml-sentiment-analyzer', '${version}', '${storageKey}', 'phase11-e2e.zip',
       'application/zip', ${bytes.byteLength}, '${sha256}', 'published',
       '${now}', '${now}', '${now}', 'kv');
    UPDATE orders
      SET status = 'paid', paid_at = '${now}', updated_at = '${now}'
      WHERE order_id = '${orderId}';
    INSERT INTO digital_deliveries
      (order_id, project_id, delivery_status, delivery_key, download_count,
       last_download_at, created_at, updated_at, file_size, sha256, release_id)
    VALUES
      ('${orderId}', 'ml-sentiment-analyzer', 'ready', '${storageKey}', 0,
       NULL, '${now}', '${now}', ${bytes.byteLength}, '${sha256}',
       (SELECT id FROM project_releases WHERE r2_key = '${storageKey}'));
    UPDATE orders
      SET delivery_id = (SELECT id FROM digital_deliveries WHERE order_id = '${orderId}'),
          delivery_status = 'ready', delivery_project_id = 'ml-sentiment-analyzer',
          updated_at = '${now}'
      WHERE order_id = '${orderId}';
  `);

  const download = await fetch(purchaseRequest(
    `${API}/api/orders/${encodeURIComponent(orderId)}/download?key=evil.zip`,
    accessToken
  ));
  if (download.status !== 200) throw new Error(`Authorized download returned ${download.status}`);
  const downloaded = new Uint8Array(await download.arrayBuffer());
  const downloadedSha = createHash('sha256').update(downloaded).digest('hex');
  if (downloadedSha !== sha256) throw new Error('Production download SHA-256 mismatch');

  const countResult = JSON.parse(d1(
    `SELECT download_count FROM digital_deliveries WHERE order_id = '${orderId}'`,
    true
  ));
  const count = countResult?.[0]?.results?.[0]?.download_count;
  if (count !== 1) throw new Error(`Expected download_count 1, received ${String(count)}`);

  const maskedToken = `${accessToken.slice(0, 6)}...${accessToken.slice(-3)}`;
  console.log('HEALTH=200 CREATE=201 UNAUTHORIZED=401 AUTHORIZED=200 DOWNLOAD=200 COUNT=1');
  console.log(`TOKEN=${maskedToken} SHA256=${sha256}`);
} finally {
  if (orderId) {
    try {
      d1(`
        DELETE FROM digital_deliveries WHERE order_id = '${orderId}';
        DELETE FROM project_releases WHERE r2_key = '${storageKey}';
        DELETE FROM orders WHERE order_id = '${orderId}';
      `);
    } catch {
      console.error('WARNING: Phase 11 D1 fixture cleanup requires review.');
    }
  }
  if (kvCreated) {
    try {
      wrangler(['kv', 'key', 'delete', storageKey, '--namespace-id', KV_NAMESPACE, '--remote']);
    } catch {
      console.error('WARNING: Phase 11 KV fixture cleanup requires review.');
    }
  }
}
