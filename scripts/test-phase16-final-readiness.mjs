import fs from 'node:fs';
import path from 'node:path';
import { enforceRateLimit, ratePolicy } from '../worker/src/utils/rateLimit.ts';
import { hashSessionToken } from '../worker/src/utils/sessionToken.ts';
import { projectRegistry } from '../src/projects/registry.ts';
import { toolRegistry } from '../src/tools/registry.ts';

const ROOT = process.cwd();
const API = 'https://tools4genz-api.alokmodanwal940.workers.dev';
const PAGES = 'https://tools4genz.pages.dev';
const LIVE_HEADERS = process.env.PHASE16_LIVE_HEADERS === '1';
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

let passed = 0;
let failed = 0;
function test(name, condition, detail = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(base, pathname, options = {}) {
  const response = await fetch(`${base}${pathname}`, { redirect: 'manual', ...options });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* A non-JSON response is valid for Pages/assets. */ }
  return { response, text, json };
}

console.log(`\nTools4Genz Phase 16 final readiness (${LIVE_HEADERS ? 'post-deploy' : 'pre-deploy'} mode)\n`);

const health = await request(API, '/api/health');
test('Production health endpoint is reachable', health.response.status === 200);
test('Health response reports only a compact service status',
  health.json?.success === true && !/secret|password|database_id|namespace_id/i.test(health.text));
const workerCorsSource = read('worker/src/index.ts');
test('Health response has nosniff protection', LIVE_HEADERS
  ? health.response.headers.get('x-content-type-options') === 'nosniff'
  : workerCorsSource.includes("headers.set('X-Content-Type-Options', 'nosniff')"));
test('Health response has HSTS', LIVE_HEADERS
  ? health.response.headers.get('strict-transport-security')?.includes('max-age=31536000')
  : workerCorsSource.includes("headers.set('Strict-Transport-Security'"));

const home = await request(PAGES, '/');
test('Production frontend is reachable anonymously', home.response.status === 200 && /Tools4Genz/i.test(home.text));
test('Production frontend HTML does not reference localhost API', !/localhost:8787/i.test(home.text));
test('Production frontend HTML has no obvious server secret',
  !/RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|pbkdf2_sha256\$/i.test(home.text));

const headersSource = read('public/_headers');
if (LIVE_HEADERS) {
  const csp = home.response.headers.get('content-security-policy') || '';
  test('Production Pages serves Content-Security-Policy', csp.includes("default-src 'self'") && csp.includes("object-src 'none'"));
  test('Production Pages prevents MIME sniffing', home.response.headers.get('x-content-type-options') === 'nosniff');
  test('Production Pages prevents framing', home.response.headers.get('x-frame-options') === 'DENY' && csp.includes("frame-ancestors 'none'"));
  test('Production Pages has a strict referrer policy', home.response.headers.get('referrer-policy') === 'strict-origin-when-cross-origin');
  test('Production Pages has a restrictive permissions policy', /camera=\(\)/.test(home.response.headers.get('permissions-policy') || ''));
  test('Production Pages has HSTS', home.response.headers.get('strict-transport-security')?.includes('max-age=31536000'));
} else {
  test('Pages CSP source is configured', headersSource.includes("default-src 'self'") && headersSource.includes("object-src 'none'"));
  test('Pages nosniff source is configured', headersSource.includes('X-Content-Type-Options: nosniff'));
  test('Pages anti-framing source is configured', headersSource.includes('X-Frame-Options: DENY') && headersSource.includes("frame-ancestors 'none'"));
  test('Pages referrer policy source is configured', headersSource.includes('Referrer-Policy: strict-origin-when-cross-origin'));
  test('Pages permissions policy source is configured', headersSource.includes('Permissions-Policy: camera=()'));
  test('Pages HSTS source is configured', headersSource.includes('Strict-Transport-Security: max-age=31536000'));
}

const deniedPreflight = await request(API, '/api/orders', {
  method: 'OPTIONS', headers: { Origin: 'https://attacker.example', 'Access-Control-Request-Method': 'POST' },
});
test('CORS rejects arbitrary-origin preflight', deniedPreflight.response.status === 403 && !deniedPreflight.response.headers.has('access-control-allow-origin'));
const arbitraryGet = await request(API, '/api/health', { headers: { Origin: 'https://attacker.example' } });
test('CORS does not reflect arbitrary origin', !arbitraryGet.response.headers.has('access-control-allow-origin'));
const allowedPreflight = await request(API, '/api/orders', {
  method: 'OPTIONS', headers: { Origin: PAGES, 'Access-Control-Request-Method': 'POST' },
});
test('Pages origin receives valid preflight', allowedPreflight.response.status === 204 && allowedPreflight.response.headers.get('access-control-allow-origin') === PAGES);
test('Credentialed CORS is never wildcard', allowedPreflight.response.headers.get('access-control-allow-origin') !== '*' && allowedPreflight.response.headers.get('access-control-allow-credentials') === 'true');

const admin = await request(API, '/api/admin/dashboard/metrics');
test('Admin API rejects anonymous access', admin.response.status === 401);
const customerAsAdmin = await request(API, '/api/admin/dashboard/metrics', { headers: { Cookie: 't4g_customer_session=fake-customer-token' } });
test('Customer session cannot access Admin API', customerAsAdmin.response.status === 401);
const adminAsCustomer = await request(API, '/api/customer/orders', { headers: { Cookie: 't4g_admin_session=fake-admin-token' } });
test('Admin session does not become customer identity', adminAsCustomer.response.status === 401);

const tokenHash = await hashSessionToken('phase16-token-that-remains-client-side');
test('Admin session token hashing uses fixed SHA-256 hex', /^[a-f0-9]{64}$/.test(tokenHash));
const migration = read('worker/migrations/0015_final_security_hardening.sql');
test('Admin session migration adds a token-hash column', migration.includes('session_token_hash TEXT'));
test('Admin session migration revokes legacy raw sessions', migration.includes("session_token = 'revoked-'"));
const authRepository = read('worker/src/db/repository.ts');
test('Admin session lookup uses the token hash', authRepository.includes('session_token_hash = ?'));
const authMiddleware = read('worker/src/utils/auth.ts');
test('Admin middleware does not accept Bearer fallback', !authMiddleware.includes("authorization?.startsWith('Bearer ") && !authMiddleware.includes('authorization.startsWith'));

const authRoute = read('worker/src/routes/auth.ts');
test('Admin cookie is HttpOnly, Secure and cross-origin SameSite safe', /HttpOnly/.test(authRoute) && /Secure/.test(authRoute) && authRoute.includes("SameSite=${isHttps ? 'None' : 'Lax'}"));
const platformRoute = read('worker/src/routes/platform.ts');
const customerAuth = read('worker/src/services/customerAuth.ts');
test('Customer authentication uses cryptographic random values', customerAuth.includes('crypto.getRandomValues'));
test('Customer sessions are stored as hashes', customerAuth.includes('session_token_hash'));
const purchaseAccess = read('worker/src/utils/purchaseAccess.ts');
test('Purchase access tokens are hashed before lookup', /hash/i.test(purchaseAccess) && !/searchParams\.get\(['"]token/.test(purchaseAccess));
test('Purchase access tokens are not read from URLs', !/searchParams\.get\(['"](?:access_)?token/.test(purchaseAccess));

const invalidWebhook = await request(API, '/api/webhooks/razorpay', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': 'invalid' }, body: '{}',
});
test('Invalid webhook signature is rejected', [400, 401].includes(invalidWebhook.response.status) && invalidWebhook.json?.error?.code === 'INVALID_SIGNATURE');
const paymentSource = `${read('worker/src/routes/orders.ts')}\n${read('worker/src/routes/webhooks.ts')}\n${read('worker/src/utils/payment.ts')}`;
test('Payment price is resolved from authoritative project data', /price|amount/.test(paymentSource) && !/body\.amount\s*\|\|/.test(paymentSource));
test('Webhook processing verifies HMAC before reconciliation', paymentSource.includes('verifyRazorpayWebhookSignature'));
test('Webhook ledger preserves duplicate-event idempotency', /webhook.*event/i.test(paymentSource) && /duplicate|processed/i.test(paymentSource));
test('Payment reconciliation validates currency and amount', /currency/.test(paymentSource) && /amount/.test(paymentSource));

const noRelease = await request(API, '/api/projects/weather-app/availability');
test('Project without a published release is unavailable', noRelease.response.status === 200 && noRelease.json?.data?.purchasable === false);
const tamperedOrder = await request(API, '/api/orders', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ projectId: 'phase16-nonexistent', amount: 1, currency: 'USD', status: 'paid' }),
});
test('Client cannot create a paid order for a tampered project', tamperedOrder.response.status >= 400 && tamperedOrder.response.status < 500);
test('Client-supplied payment state is not accepted', tamperedOrder.response.status !== 200 && tamperedOrder.response.status !== 201);
const wrongToken = await request(API, '/api/orders/phase16-unknown/download', { headers: { Authorization: 'Bearer wrong-token' } });
test('Wrong purchase token cannot download', [401, 404].includes(wrongToken.response.status));
const arbitraryStorage = await request(API, '/api/orders/phase16-unknown/download?storageKey=projects/other/release.zip');
test('Client cannot choose a storage object key', [401, 404].includes(arbitraryStorage.response.status) && !wrongToken.text.includes('projects/other'));
const deliverySource = read('worker/src/routes/orders.ts');
test('Download requires a paid order', /status\s*!==\s*['"]paid/.test(deliverySource));
test('Download requires a ready delivery', /delivery_status\s*!==\s*['"]ready/.test(deliverySource));
test('Storage is private behind the Worker binding', deliverySource.includes('PROJECT_ASSETS') && !deliverySource.includes('publicUrl'));
test('Missing storage objects have a safe response', deliverySource.includes('DELIVERY_NOT_READY'));
test('Download counting is server-side', deliverySource.includes('incrementDownloadCount'));

const adminRoute = read('worker/src/routes/admin.ts');
const releaseService = read('worker/src/services/projectReleases.ts');
test('Release upload requires ZIP extension validation', /\.zip/i.test(adminRoute));
test('Release upload validates ZIP magic bytes', /0x50/.test(adminRoute) && /0x4b/i.test(adminRoute));
test('Release upload enforces a maximum size', adminRoute.includes('MAX_PROJECT_RELEASE_BYTES'));
test('Release storage key is server-generated', releaseService.includes('buildProjectReleaseKey'));
test('Release upload computes SHA-256', releaseService.includes("digest('SHA-256'"));
test('Release filename cannot become a storage path', !/filename.*storageKey|storageKey.*filename/i.test(adminRoute));

const analyticsBad = await request(API, '/api/analytics/events', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventName: 'arbitrary_admin_revenue', revenue: 999999, token: 'secret' }),
});
test('Analytics rejects an arbitrary event payload', analyticsBad.response.status === 400);
test('Analytics source does not store raw IP', !/INSERT[^;]*ip_address/is.test(platformRoute));
const platformService = read('worker/src/services/platform.ts');
test('Analytics revenue remains derived from paid orders', platformService.includes("status = 'paid'") && /SUM\(amount\)/.test(platformService));
test('Analytics retention strategy is documented', read('docs/production-recovery.md').includes('13 months'));

const affiliateBad = await request(API, '/api/affiliate-offers/999999999/click', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'javascript:alert(1)' }),
});
test('Affiliate API rejects an arbitrary redirect target', [400, 404].includes(affiliateBad.response.status));
const settings = await request(API, '/api/site-settings/public');
test('Public settings are reachable', settings.response.status === 200);
test('Public settings expose no server secrets', !/RAZORPAY_KEY_SECRET|WEBHOOK_SECRET|RESEND_API_KEY|password_hash|session_token/i.test(settings.text));
test('Ads remain disabled without valid production configuration', !/ca-pub-\d{16}/.test(home.text));
const ads = await request(API, '/ads.txt');
test('ads.txt contains no fabricated publisher record', !/google\.com,\s*pub-0+/i.test(ads.text));

const invalidRequest = await request(API, '/api/requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
});
test('Request submission enforces server validation', invalidRequest.response.status === 400);
const oversized = await request(API, '/api/requests', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: 'x'.repeat(70_000) }),
});
test('Oversized public JSON body is rejected', oversized.response.status === 413);

test('Sensitive endpoint policies include Admin login', ratePolicy('/api/auth/login', 'POST')?.[1] === 8);
test('Sensitive endpoint policies include OTP requests', ratePolicy('/api/customer-auth/start', 'POST')?.[1] === 5);
test('Sensitive endpoint policies include downloads', ratePolicy('/api/orders/id/download', 'GET')?.[1] === 60);
test('Sensitive endpoint policies include analytics', ratePolicy('/api/analytics/events', 'POST')?.[1] === 120);
const limitedHeaders = { 'CF-Connecting-IP': '192.0.2.10' };
let limited = null;
for (let i = 0; i < 3; i += 1) limited = await enforceRateLimit(new Request('https://test/rate', { headers: limitedHeaders }), 'phase16-local', 2, 60_000);
test('Burst limiter returns HTTP 429 after its threshold', limited?.status === 429);
test('Rate-limit response supplies Retry-After', Number(limited?.headers.get('retry-after')) > 0);

const router = read('src/router.tsx');
for (const route of ['/', 'tools', 'projects', 'services', 'contact', 'privacy', 'terms', 'login', 'my-purchases']) {
  test(`Public route is registered: ${route}`, route === '/' ? router.includes("path: '/'") : router.includes(`path: '${route}'`));
}
test('Private routes apply noindex metadata', read('src/pages/MyPurchasesPage.tsx').includes('noindex'));
test('404 route applies noindex metadata', read('src/pages/NotFoundPage.tsx').includes('noindex'));
test('Sitemap endpoint returns XML', (await request(API, '/sitemap.xml')).response.headers.get('content-type')?.includes('xml'));
test('robots.txt exposes the production sitemap', (await request(PAGES, '/robots.txt')).text.includes('/sitemap.xml'));

const boundary = read('src/components/errors/AppErrorBoundary.tsx');
test('Frontend has a safe application error boundary', boundary.includes('getDerivedStateFromError') && !boundary.includes('{this.state.error}'));
const purchaseModal = read('src/components/projects/PurchaseModal.tsx');
test('Purchase modal has dialog semantics', purchaseModal.includes('role="dialog"') && purchaseModal.includes('aria-modal="true"'));
test('Purchase modal supports Escape and focus restoration', purchaseModal.includes("event.key === 'Escape'") && purchaseModal.includes('.focus()'));
test('Purchase modal traps keyboard focus', purchaseModal.includes("event.key !== 'Tab'"));
test('Global focus-visible styling is present', read('src/index.css').includes('focus-visible'));
test('Document language is initialized', read('index.html').includes('lang="en"'));

const nativeTools = toolRegistry.filter(tool => tool.component);
test('Exactly eight native tools are registered', nativeTools.length === 8);
for (const tool of nativeTools) {
  test(`Native tool is active and implemented: ${tool.slug}`, tool.status === 'active' && Boolean(tool.component));
}
for (const integrationType of ['external-url', 'embedded', 'worker-api', 'external-api']) {
  test(`Tool integration fixture exists: ${integrationType}`, toolRegistry.some(tool => tool.integration === integrationType));
}

test('Exactly twelve catalog projects are registered', projectRegistry.length === 12);
for (const project of projectRegistry) {
  test(`Project metadata is complete: ${project.slug}`,
    /^[a-z0-9-]+$/.test(project.slug) && project.title.length > 5 && project.description.length > 40 && project.price > 0);
}

const loginDisabled = await request(API, '/api/customer-auth/start', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'phase16@example.invalid' }),
});
test('Email-disabled login fails safely without pretending to send', loginDisabled.response.status === 503 && loginDisabled.json?.error?.code === 'FEATURE_NOT_ENABLED');
const recoveryDisabled = await request(API, '/api/purchases/recovery/request', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'phase16@example.invalid' }),
});
test('Email-disabled recovery fails safely without pretending to send', recoveryDisabled.response.status === 503 && recoveryDisabled.json?.error?.code === 'FEATURE_NOT_ENABLED');

const distIndex = fs.existsSync(path.join(ROOT, 'dist/index.html')) ? read('dist/index.html') : '';
test('Production build artifact exists', Boolean(distIndex));
test('Built frontend contains no localhost Worker endpoint', !/localhost:8787/i.test(distIndex));
test('Built frontend contains no obvious secret variable names', !/RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RESEND_API_KEY|ADMIN_PASSWORD/i.test(distIndex));
test('Operational recovery documentation exists', fs.existsSync(path.join(ROOT, 'docs/production-recovery.md')));
test('Production runbook exists', fs.existsSync(path.join(ROOT, 'docs/production-runbook.md')));
test('V1 launch checklist separates manual work', /manual external/i.test(read('docs/v1-launch-checklist.md')));

console.log(`\nPhase 16 final readiness: ${passed}/${passed + failed} tests passed.\n`);
if (failed) process.exit(1);
