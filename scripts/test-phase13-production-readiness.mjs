import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, '$1').replaceAll('/', '\\');
const API = 'https://tools4genz-api.alokmodanwal940.workers.dev';
const PAGES = 'https://tools4genz.pages.dev';
const CONFIG = join(ROOT, 'worker', 'wrangler.toml');
const DB = 'tools4genz-db';
const KV = 'PROJECT_ASSETS';
const marker = `phase13-${randomUUID()}`;
const projectId = 'weather-app';
const version = marker;
const storageKey = `projects/${projectId}/releases/${version}/release.zip`;
const sessionId = `anon_${marker.replaceAll('-', '')}`;
const analyticsEntity = marker;
const fixtureEmail = `${marker}@example.invalid`;
const fixtureBytes = Buffer.from(`Tools4Genz Phase 13 private delivery fixture\n${marker}\n`, 'utf8');
const sha256 = createHash('sha256').update(fixtureBytes).digest('hex');
const tempDir = mkdtempSync(join(tmpdir(), 'tools4genz-phase13-'));
const tempAsset = join(tempDir, 'release.zip');
writeFileSync(tempAsset, fixtureBytes);

let passed = 0;
let failed = 0;
let orderId = '';
let accessToken = '';
let releaseId = 0;

function test(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function npx(args, { allowFailure = false } = {}) {
  const localCli = join(ROOT, 'node_modules', 'npm', 'bin', 'npx-cli.js');
  const cli = existsSync(localCli)
    ? localCli
    : join(process.env.ProgramFiles || 'C:\\Program Files', 'nodejs', 'node_modules', 'npm', 'bin', 'npx-cli.js');
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`npx ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result;
}

function d1(sql) {
  const normalized = sql.replace(/\s+/g, ' ').trim();
  if (/^(SELECT|WITH)\b/i.test(normalized) && !normalized.slice(0, -1).includes(';')) {
    const result = npx([
      'wrangler', 'd1', 'execute', DB, '--remote', '--config', CONFIG,
      '--command', normalized.replace(/;$/, ''), '--json', '--yes',
    ]);
    const parsed = JSON.parse(result.stdout);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries.at(-1)?.results || [];
  }
  const sqlFile = join(tempDir, `query-${randomUUID()}.sql`);
  writeFileSync(sqlFile, `${sql.trim()}\n`);
  try {
    const result = npx([
      'wrangler', 'd1', 'execute', DB, '--remote', '--config', CONFIG,
      '--file', sqlFile, '--json', '--yes',
    ]);
    return [];
  } finally {
    rmSync(sqlFile, { force: true });
  }
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function putKv() {
  const metadata = JSON.stringify({
    size: fixtureBytes.length,
    contentType: 'application/zip',
    sha256,
    projectId,
    version,
  });
  npx(['wrangler', 'kv', 'key', 'put', storageKey, '--path', tempAsset,
    '--metadata', metadata, '--binding', KV, '--remote', '--config', CONFIG]);
}

function deleteKv() {
  npx(['wrangler', 'kv', 'key', 'delete', storageKey,
    '--binding', KV, '--remote', '--config', CONFIG], { allowFailure: true });
}

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('json') ? await response.json() : await response.arrayBuffer();
  return { response, body };
}

async function cleanup() {
  try {
    if (orderId) {
      d1(`DELETE FROM digital_deliveries WHERE order_id = ${sqlString(orderId)};
          DELETE FROM orders WHERE order_id = ${sqlString(orderId)};`);
    }
    d1(`DELETE FROM project_releases WHERE project_id = ${sqlString(projectId)} AND version = ${sqlString(version)};
        DELETE FROM analytics_events WHERE session_id = ${sqlString(sessionId)} OR entity_id = ${sqlString(analyticsEntity)};`);
  } catch (error) {
    console.error(`Cleanup database warning: ${error.message}`);
  }
  try { deleteKv(); } catch (error) { console.error(`Cleanup KV warning: ${error.message}`); }
}

console.log('\nTools4Genz Phase 13 production readiness\n');

try {
  test('Pages production build exists', existsSync(join(ROOT, 'dist', 'index.html')));
  const redirects = readFileSync(join(ROOT, 'public', '_redirects'), 'utf8');
  test('SPA fallback is configured', redirects.includes('/* /index.html 200'));
  const distFiles = [join(ROOT, 'dist', 'index.html')];
  const distIndex = readFileSync(distFiles[0], 'utf8');
  test('Production HTML has no localhost Worker URL', !distIndex.includes('localhost:8787'));

  const pagesHome = await fetch(PAGES);
  test('Anonymous Pages browsing works', pagesHome.status === 200 && (await pagesHome.text()).includes('id="root"'));
  const pagesNested = await fetch(`${PAGES}/my-purchases`);
  test('Pages nested SPA route works', pagesNested.status === 200 && (await pagesNested.text()).includes('id="root"'));

  const health = await request('/api/health');
  test('Production Worker health works', health.response.status === 200 && health.body?.success === true);
  const migrations = d1('SELECT name FROM d1_migrations ORDER BY id;').map((row) => row.name);
  test('Migration 0012 is applied', migrations.some((name) => String(name).startsWith('0012')));
  test('Migration 0013 is applied', migrations.some((name) => String(name).startsWith('0013')));

  const tools = await request('/api/tools');
  test('Public tool endpoint works', tools.response.status === 200 && Array.isArray(tools.body?.data));
  const settings = await request('/api/site-settings/public');
  const settingsKeys = Object.keys(settings.body?.data || {});
  const safeSettings = ['site_name', 'tagline', 'short_description', 'support_email', 'whatsapp_number',
    'phone_number', 'location_text', 'business_hours', 'support_message', 'purchase_support_email',
    'service_enquiry_message', 'instagram_url', 'youtube_url', 'github_url', 'linkedin_url',
    // Phase 15 public presentation flags/IDs. These are intentionally public
    // browser configuration, not provider credentials or server secrets.
    'ads_enabled', 'adsense_enabled', 'adsense_publisher_id', 'auto_ads_enabled',
    'ads_on_tools', 'ads_on_projects', 'ads_on_services', 'consent_provider_configured',
    'consent_provider_name', 'adsense_tools_listing_slot_id', 'adsense_tool_content_slot_id',
    'adsense_project_content_slot_id', 'adsense_services_content_slot_id', 'affiliate_enabled',
    'affiliate_disclosure_text', 'premium_features_enabled'];
  test('Public settings expose only allowlisted fields', settings.response.status === 200 && settingsKeys.every((key) => safeSettings.includes(key)));
  test('Public settings contain no secret-like fields', !settingsKeys.some((key) => /secret|token|hash|api.?key|password/i.test(key)));
  test('Contact settings are safe when unconfigured', settings.body?.data?.support_email === '' && settings.body?.data?.phone_number === '');

  const authStatus = await request('/api/customer-auth/status');
  test('Customer login is safely disabled without email configuration', authStatus.response.status === 200 && authStatus.body?.data?.enabled === false);
  const unavailable = await request(`/api/projects/${projectId}/availability`);
  test('Project without release is unavailable', unavailable.response.status === 200 && unavailable.body?.data?.purchasable === false);
  const rejectedOrder = await request('/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: PAGES },
    body: JSON.stringify({ projectId, customerName: 'Phase Tester', customerEmail: fixtureEmail, amount: 1 }),
  });
  test('Purchase without release is rejected', rejectedOrder.response.status === 409 && rejectedOrder.body?.error?.code === 'PROJECT_NOT_AVAILABLE');

  const customerAdmin = await request('/api/admin/dashboard/metrics', {
    headers: { Cookie: 't4g_customer_session=fake_customer_session' },
  });
  test('Customer session cannot access Admin APIs', customerAdmin.response.status === 401);

  const analytics = await request('/api/analytics/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: PAGES },
    body: JSON.stringify({ sessionId, eventName: 'project_view', entityType: 'project', entityId: analyticsEntity,
      revenue: 999999, purchaseToken: 'must-not-be-recorded', adminRole: true }),
  });
  test('Analytics accepts allowlisted event', analytics.response.status === 201 && analytics.body?.data?.recorded === true);
  const storedAnalytics = d1(`SELECT session_id, customer_user_id, event_name, entity_type, entity_id FROM analytics_events WHERE session_id = ${sqlString(sessionId)};`);
  test('Arbitrary analytics payload is ignored', storedAnalytics.length === 1 && Object.keys(storedAnalytics[0]).every((key) =>
    ['session_id', 'customer_user_id', 'event_name', 'entity_type', 'entity_id'].includes(key)));
  test('Pages origin receives production CORS', analytics.response.headers.get('access-control-allow-origin') === PAGES);

  putKv();
  const timestamp = new Date().toISOString();
  d1(`INSERT INTO project_releases
      (project_id, version, r2_key, filename, content_type, file_size, sha256, status, created_at, updated_at, published_at, storage_provider)
      VALUES (${sqlString(projectId)}, ${sqlString(version)}, ${sqlString(storageKey)}, 'release.zip', 'application/zip',
      ${fixtureBytes.length}, ${sqlString(sha256)}, 'published', ${sqlString(timestamp)}, ${sqlString(timestamp)}, ${sqlString(timestamp)}, 'kv');`);
  releaseId = Number(d1(`SELECT id FROM project_releases WHERE project_id = ${sqlString(projectId)} AND version = ${sqlString(version)};`)[0]?.id || 0);
  const available = await request(`/api/projects/${projectId}/availability`);
  test('Published synthetic release enables availability', releaseId > 0 && available.body?.data?.purchasable === true);

  const orderResult = await request('/api/orders', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: PAGES },
    body: JSON.stringify({ projectId, customerName: 'Phase Tester', customerEmail: fixtureEmail,
      amount: 1, currency: 'USD', deliveryKey: 'attacker-controlled-key' }),
  });
  orderId = orderResult.body?.data?.orderId || '';
  accessToken = orderResult.body?.data?.accessToken || '';
  test('Production Razorpay TEST order is created', orderResult.response.status === 201 && orderId && /^rzp_test_/.test(orderResult.body?.data?.keyId || ''));
  test('Order amount and currency are server-authoritative', orderResult.body?.data?.amount === 999 && orderResult.body?.data?.currency === 'INR');
  const orderRow = d1(`SELECT project_id, amount, currency, status FROM orders WHERE order_id = ${sqlString(orderId)};`)[0];
  test('Browser storage/payment fields are not trusted', orderRow?.project_id === projectId && orderRow?.amount === 999 && orderRow?.currency === 'INR' && orderRow?.status === 'payment_pending');

  const unpaidDownload = await request(`/api/orders/${encodeURIComponent(orderId)}/download`, {
    headers: { Authorization: `Purchase ${accessToken}` },
  });
  test('Unpaid synthetic order cannot download', unpaidDownload.response.status === 402 && unpaidDownload.body?.error?.code === 'PAYMENT_REQUIRED');

  const paidAt = new Date().toISOString();
  d1(`UPDATE orders SET status = 'paid', paid_at = ${sqlString(paidAt)}, updated_at = ${sqlString(paidAt)} WHERE order_id = ${sqlString(orderId)};
      INSERT INTO digital_deliveries (order_id, project_id, delivery_status, delivery_key, download_count, created_at, updated_at, file_size, sha256, release_id)
      VALUES (${sqlString(orderId)}, ${sqlString(projectId)}, 'ready', ${sqlString(storageKey)}, 0, ${sqlString(paidAt)}, ${sqlString(paidAt)}, ${fixtureBytes.length}, ${sqlString(sha256)}, ${releaseId});
      UPDATE orders SET delivery_id = (SELECT id FROM digital_deliveries WHERE order_id = ${sqlString(orderId)}), delivery_status = 'ready', delivery_project_id = ${sqlString(projectId)} WHERE order_id = ${sqlString(orderId)};`);

  const deniedDownload = await request(`/api/orders/${encodeURIComponent(orderId)}/download`);
  test('Secure download requires purchase authorization', deniedDownload.response.status === 401);
  const download = await request(`/api/orders/${encodeURIComponent(orderId)}/download?key=${encodeURIComponent('attacker-key')}`, {
    headers: { Authorization: `Purchase ${accessToken}` },
  });
  const downloaded = Buffer.from(download.body);
  test('Synthetic private delivery works', download.response.status === 200 && downloaded.equals(fixtureBytes));
  test('Secure download SHA-256 matches', createHash('sha256').update(downloaded).digest('hex') === sha256);
  test('Arbitrary storage key is ignored', download.response.status === 200 && !downloaded.includes('attacker-key'));
  const delivery = d1(`SELECT download_count, delivery_key FROM digital_deliveries WHERE order_id = ${sqlString(orderId)};`)[0];
  test('Download count increments server-side', delivery?.download_count === 1);
  const publicOrder = await request(`/api/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Purchase ${accessToken}` },
  });
  test('Public order response does not expose storage key', publicOrder.response.status === 200 && !JSON.stringify(publicOrder.body).includes(storageKey));
} catch (error) {
  failed += 1;
  console.error(`  FAIL  unexpected suite error — ${error.stack || error.message}`);
} finally {
  await cleanup();
  try {
    const residue = d1(`SELECT
      (SELECT COUNT(*) FROM project_releases WHERE project_id = ${sqlString(projectId)} AND version = ${sqlString(version)}) releases,
      (SELECT COUNT(*) FROM orders WHERE customer_email = ${sqlString(fixtureEmail)}) orders_count,
      (SELECT COUNT(*) FROM analytics_events WHERE session_id = ${sqlString(sessionId)}) analytics_count;`)[0];
    test('Production cleanup leaves no D1 fixture residue', residue?.releases === 0 && residue?.orders_count === 0 && residue?.analytics_count === 0);
  } catch (error) {
    test('Production cleanup leaves no D1 fixture residue', false, error.message);
  }
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(`\n${passed}/${passed + failed} tests passed`);
if (failed) process.exitCode = 1;
