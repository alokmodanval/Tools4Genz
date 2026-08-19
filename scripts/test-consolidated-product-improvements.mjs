import { readFileSync } from 'node:fs';
import worker from '../worker/src/index.ts';
import {
  handleAnalytics,
  handleCustomerOrders,
  handleGetPublicTools,
  handleUpdateSettings,
  validateAdminToolPayload,
} from '../worker/src/routes/platform.ts';
import {
  createLoginChallenge,
  currentCustomer,
  customerSessionCookie,
  revokeCustomerSession,
  verifyLoginChallenge,
} from '../worker/src/services/customerAuth.ts';
import { getPlatformMetrics, getPublicSettings } from '../worker/src/services/platform.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const compact = (sql) => sql.replace(/\s+/g, ' ').trim();
const now = () => new Date().toISOString();

class MockEmailProvider {
  constructor() { this.name = 'mock'; this.messages = []; }
  async send(message) { this.messages.push(message); return { provider: 'mock', messageId: `mail_${this.messages.length}` }; }
}

class Statement {
  constructor(db, sql) { this.db = db; this.sql = compact(sql); this.values = []; }
  bind(...values) { this.values = values; return this; }
  async first() { return (await this.all()).results[0] || null; }
  async all() {
    const s = this.sql; const v = this.values;
    if (s.includes('FROM admin_tools WHERE slug = ?')) {
      return { results: this.db.tools.filter((row) => row.slug === v[0] && row.id !== v[1]).slice(0, 1) };
    }
    if (s.includes('FROM admin_tools')) return { results: [...this.db.tools] };
    if (s.includes('FROM site_settings')) {
      return { results: [...this.db.settings.entries()].map(([setting_key, setting_value]) => ({ setting_key, setting_value })) };
    }
    if (s.includes('FROM customer_login_challenges')) {
      const rows = this.db.challenges.filter((row) => row.email_normalized === v[0] && row.used_at === null)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return { results: rows.slice(0, 1).map((row) => ({ ...row })) };
    }
    if (s.includes('FROM customer_sessions s JOIN customer_users u')) {
      const session = this.db.sessions.find((row) => row.session_token_hash === v[0] && row.expires_at > v[1] && row.revoked_at === null);
      const user = session && this.db.users.find((row) => row.id === session.user_id && row.status === 'active');
      return { results: user ? [{ id: user.id, email: user.email_normalized, displayName: user.display_name, status: user.status }] : [] };
    }
    if (s.includes('FROM customer_users WHERE email_normalized = ?')) {
      const user = this.db.users.find((row) => row.email_normalized === v[0]);
      return { results: user ? [{ id: user.id, email: user.email_normalized, displayName: user.display_name, status: user.status }] : [] };
    }
    if (s.includes('FROM orders WHERE customer_user_id = ?')) {
      return { results: this.db.orders.filter((row) => row.customer_user_id === v[0]).map((row) => ({
        orderId: row.order_id, projectId: row.project_id, projectTitle: row.project_title, amount: row.amount,
        currency: row.currency, status: row.status, paidAt: row.paid_at, createdAt: row.created_at,
        deliveryStatus: row.delivery_status,
      })) };
    }
    if (s.includes('COUNT(DISTINCT session_id) c FROM analytics_events WHERE created_at >= ?')) {
      return { results: [{ c: new Set(this.db.events.filter((event) => event.created_at >= v[0]).map((event) => event.session_id)).size }] };
    }
    if (s.includes("COUNT(*) c FROM analytics_events WHERE event_name = 'page_view'")) return { results: [{ c: this.db.events.filter((event) => event.event_name === 'page_view').length }] };
    if (s.includes('COUNT(DISTINCT session_id) c FROM analytics_events WHERE customer_user_id IS NULL')) return { results: [{ c: new Set(this.db.events.filter((event) => event.customer_user_id === null).map((event) => event.session_id)).size }] };
    if (s.includes('COUNT(*) c FROM customer_users WHERE created_at >= ?')) return { results: [{ c: this.db.users.filter((user) => user.created_at >= v[0]).length }] };
    if (s.includes('COUNT(*) c FROM customer_users')) return { results: [{ c: this.db.users.length }] };
    if (s.includes('COUNT(*) c FROM requests')) return { results: [{ c: 0 }] };
    if (s.includes("COUNT(*) c FROM orders WHERE status = 'paid'")) return { results: [{ c: this.db.orders.filter((order) => order.status === 'paid').length }] };
    if (s.includes("COUNT(*) c FROM orders WHERE status IN ('created','payment_pending')")) return { results: [{ c: this.db.orders.filter((order) => ['created', 'payment_pending'].includes(order.status)).length }] };
    if (s.includes("COUNT(*) c FROM orders WHERE status = 'payment_failed'")) return { results: [{ c: this.db.orders.filter((order) => order.status === 'payment_failed').length }] };
    if (s.includes('SUM(amount)') && s.includes("status = 'paid'")) return { results: [{ c: this.db.orders.filter((order) => order.status === 'paid').reduce((sum, order) => sum + order.amount, 0) }] };
    if (s.includes('FROM digital_deliveries')) return { results: [{ c: 0 }] };
    if (s.includes('GROUP BY entity_id')) return { results: [] };
    if (s.includes('FROM admin_sessions')) return { results: [] };
    return { results: [] };
  }
  async run() {
    const s = this.sql; const v = this.values;
    if (s.startsWith('INSERT INTO customer_login_challenges')) {
      this.db.challenges.push({ id: this.db.nextChallenge++, email_normalized: v[0], code_hash: v[1], expires_at: v[2], used_at: null, attempt_count: 0, created_at: v[3] });
      return { meta: { changes: 1, last_row_id: this.db.nextChallenge - 1 } };
    }
    if (s.startsWith('UPDATE customer_login_challenges SET attempt_count')) {
      const row = this.db.challenges.find((item) => item.id === v[0]); if (row) row.attempt_count += 1;
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE customer_login_challenges SET used_at')) {
      const row = this.db.challenges.find((item) => item.id === v[1] && item.used_at === null); if (row) row.used_at = v[0];
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('INSERT INTO customer_users')) {
      let user = this.db.users.find((item) => item.email_normalized === v[0]);
      if (!user) { user = { id: this.db.nextUser++, email_normalized: v[0], display_name: null, status: 'active', created_at: v[1], updated_at: v[2], last_login_at: v[3] }; this.db.users.push(user); }
      else { user.updated_at = v[2]; user.last_login_at = v[3]; }
      return { meta: { changes: 1, last_row_id: user.id } };
    }
    if (s.startsWith('INSERT INTO customer_sessions')) {
      this.db.sessions.push({ id: this.db.nextSession++, user_id: v[0], session_token_hash: v[1], expires_at: v[2], created_at: v[3], last_seen_at: v[4], revoked_at: null });
      return { meta: { changes: 1, last_row_id: this.db.nextSession - 1 } };
    }
    if (s.startsWith('UPDATE customer_sessions SET last_seen_at')) {
      const row = this.db.sessions.find((item) => item.session_token_hash === v[1]); if (row) row.last_seen_at = v[0];
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('UPDATE customer_sessions SET revoked_at')) {
      const row = this.db.sessions.find((item) => item.session_token_hash === v[1]); if (row) row.revoked_at = v[0];
      return { meta: { changes: row ? 1 : 0, last_row_id: 0 } };
    }
    if (s.startsWith('INSERT INTO site_settings')) {
      this.db.settings.set(v[0], v[1]); return { meta: { changes: 1, last_row_id: 0 } };
    }
    if (s.startsWith('INSERT INTO analytics_events')) {
      this.db.events.push({ id: this.db.nextEvent++, session_id: v[0], customer_user_id: v[1], event_name: v[2], entity_type: v[3], entity_id: v[4], created_at: v[5] });
      return { meta: { changes: 1, last_row_id: this.db.nextEvent - 1 } };
    }
    return { meta: { changes: 0, last_row_id: 0 } };
  }
}

class MemoryD1 {
  constructor() {
    this.tools = []; this.settings = new Map(); this.challenges = []; this.users = []; this.sessions = [];
    this.orders = []; this.events = []; this.nextChallenge = 1; this.nextUser = 1; this.nextSession = 1; this.nextEvent = 1;
  }
  prepare(sql) { return new Statement(this, sql); }
  async batch(statements) { return Promise.all(statements.map((statement) => statement.run())); }
}

async function responseData(response) { return (await response.json()).data; }

async function main() {
  let passed = 0;
  const check = (condition, label) => { if (!condition) throw new Error(`FAIL: ${label}`); passed += 1; console.log(`✅ ${passed}. ${label}`); };
  console.log('🧪 Consolidated Product Improvements — Security & Behavior\n');
  const db = new MemoryD1(); const provider = new MockEmailProvider(); const env = { DB: db, EMAIL_PROVIDER: provider };

  const router = read('src/router.tsx'); const projectPage = read('src/pages/ProjectDetailPage.tsx');
  check(router.includes("path: 'tools'") && !router.includes("path: 'tools', element: <AdminProtectedRoute"), 'Public browsing requires no customer login');
  check(read('src/pages/ToolsPage.tsx').includes('publicTools()'), 'Tool catalog loads anonymously from the public API');
  check(projectPage.includes('getProjectAvailability') && !projectPage.includes('CustomerProtectedRoute'), 'Project detail remains publicly browseable');
  check(projectPage.includes("navigate(`/login?returnTo=") && projectPage.includes('customerLoginEnabled && !user'), 'Anonymous buy redirects to login only when customer auth is enabled');

  check(await createLoginChallenge(db, 'buyer@example.com', env) === 'sent' && provider.messages.length === 1, 'Customer login sends a code through the configured provider');
  const code = provider.messages[0].text.match(/\b\d{6}\b/)[0];
  check(!(await verifyLoginChallenge(db, 'buyer@example.com', '000000')).ok && db.challenges[0].attempt_count === 1, 'Invalid OTP is rejected and counted');
  const expiredDb = new MemoryD1(); await createLoginChallenge(expiredDb, 'expired@example.com', env); expiredDb.challenges[0].expires_at = new Date(Date.now() - 1000).toISOString();
  check((await verifyLoginChallenge(expiredDb, 'expired@example.com', provider.messages[1].text.match(/\b\d{6}\b/)[0])).reason === 'expired', 'Expired OTP is rejected');
  const verified = await verifyLoginChallenge(db, 'buyer@example.com', code);
  check(verified.ok && db.users.length === 1, 'Valid OTP creates or updates the customer account');
  check((await verifyLoginChallenge(db, 'buyer@example.com', code)).reason === 'invalid', 'Used OTP cannot be replayed');
  check(verified.ok && !JSON.stringify(db.sessions).includes(verified.token) && customerSessionCookie(verified.token).includes('HttpOnly; Secure; SameSite=None'), 'Session stores only a hash and uses a secure HttpOnly cookie');
  const customerCookie = `t4g_customer_session=${verified.token}`;
  check((await currentCustomer(new Request('https://test/api/customer-auth/status', { headers: { Cookie: customerCookie } }), db))?.email === 'buyer@example.com', 'Valid customer session resolves its own account');
  await revokeCustomerSession(new Request('https://test/api/customer-auth/logout', { headers: { Cookie: customerCookie } }), db);
  check(await currentCustomer(new Request('https://test/api/customer-auth/status', { headers: { Cookie: customerCookie } }), db) === null, 'Logout revokes the server-side session');

  await createLoginChallenge(db, 'buyer@example.com', env); const code2 = provider.messages.at(-1).text.match(/\b\d{6}\b/)[0]; const session2 = await verifyLoginChallenge(db, 'buyer@example.com', code2);
  const cookie2 = `t4g_customer_session=${session2.token}`;
  db.users.push({ id: 2, email_normalized: 'other@example.com', display_name: null, status: 'active', created_at: now(), updated_at: now(), last_login_at: now() });
  db.orders.push(
    { order_id: 'ORDER-A', customer_user_id: 1, project_id: 'a', project_title: 'A', amount: 1200, currency: 'INR', status: 'paid', paid_at: now(), created_at: now(), delivery_status: 'ready' },
    { order_id: 'ORDER-B', customer_user_id: 2, project_id: 'b', project_title: 'B', amount: 999999, currency: 'INR', status: 'paid', paid_at: now(), created_at: now(), delivery_status: 'ready' },
    { order_id: 'ORDER-PENDING', customer_user_id: 1, project_id: 'c', project_title: 'C', amount: 500, currency: 'INR', status: 'payment_pending', paid_at: null, created_at: now(), delivery_status: 'pending' },
  );
  const ownOrders = await responseData(await handleCustomerOrders(new Request('https://test/api/customer/orders', { headers: { Cookie: cookie2 } }), db));
  check(ownOrders.length === 2 && ownOrders.every((order) => order.orderId !== 'ORDER-B'), 'Customer A cannot view Customer B purchases');
  const orderRoute = read('worker/src/routes/orders.ts');
  check(orderRoute.includes('authenticatedCustomer.id') && orderRoute.includes('currentCustomer(request, db)'), 'Frontend customer user ID is ignored in favor of the session identity');
  check(read('src/services/orderService.ts').includes("Authorization: `Purchase ${accessToken}`"), 'Phase 11 purchase-token authorization remains in use');
  check(!customerCookie.includes('admin_session') && read('worker/src/services/customerAuth.ts').includes("const COOKIE = 't4g_customer_session'"), 'Admin and customer cookies use separate identities');
  let response = await worker.fetch(new Request('https://test/api/admin/analytics', { headers: { Cookie: cookie2 } }), env);
  check(response.status === 401, 'Customer session cannot access admin APIs');

  const external = { id: 'tool-external', slug: 'external-helper', name: 'External Helper', integration: 'external-url', integrationConfig: { url: 'https://example.com/tool' } };
  check(await validateAdminToolPayload(db, external) === null, 'Admin can configure a safe external URL tool');
  db.tools.push({ id: external.id, slug: external.slug, name: external.name, category: 'writing-tools', status: 'active', featured: 0, data: JSON.stringify(external), created_at: now() });
  let publicTools = await responseData(await handleGetPublicTools(db));
  check(publicTools.some((tool) => tool.slug === external.slug), 'Published D1 tool appears in the public catalog');
  db.tools[0].status = 'disabled'; publicTools = await responseData(await handleGetPublicTools(db));
  check(!publicTools.some((tool) => tool.slug === external.slug), 'Hidden tool disappears from the public catalog');
  db.tools[0].status = 'draft'; publicTools = await responseData(await handleGetPublicTools(db));
  check(!publicTools.some((tool) => tool.slug === external.slug), 'Draft tool is excluded from the public catalog');
  db.tools[0].status = 'active';
  check((await validateAdminToolPayload(db, { ...external, id: 'different-tool' }))?.status === 409, 'Duplicate tool slug is rejected');
  db.tools.push({ id: 'invented-native', slug: 'invented-native', name: 'Unsafe Native', category: 'other', status: 'active', featured: 0, data: JSON.stringify({ integration: 'native' }), created_at: now() });
  publicTools = await responseData(await handleGetPublicTools(db));
  check(!publicTools.some((tool) => tool.id === 'invented-native'), 'D1 cannot fabricate an unshipped native React component');
  db.tools.push({ id: 'safe-api', slug: 'safe-api', name: 'Safe API', category: 'other', status: 'active', featured: 0, data: JSON.stringify({ integration: 'external-api', internalToken: 'root-secret', integrationConfig: { endpointId: 'configured-endpoint', apiKey: 'secret-key', secret: 'hidden' } }), created_at: now() });
  publicTools = await responseData(await handleGetPublicTools(db));
  const apiTool = publicTools.find((tool) => tool.id === 'safe-api');
  check(apiTool && !JSON.stringify(apiTool).includes('secret-key') && !JSON.stringify(apiTool).includes('hidden') && !JSON.stringify(apiTool).includes('root-secret'), 'Public tools API allowlists fields and strips sensitive integration configuration');

  response = await worker.fetch(new Request('https://test/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }), env);
  check(response.status === 401, 'Unauthorized site settings update is rejected');
  await handleUpdateSettings(new Request('https://test/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site_name: 'Tools4Genz Lab', support_email: 'help@example.com', razorpay_secret: 'must-not-save' }) }), db);
  check(db.settings.get('site_name') === 'Tools4Genz Lab' && db.settings.get('support_email') === 'help@example.com', 'Authorized settings handler persists editable public settings');
  const settings = await getPublicSettings(db);
  check(settings.site_name === 'Tools4Genz Lab' && !('razorpay_secret' in settings) && !JSON.stringify(settings).includes('must-not-save'), 'Public settings return only whitelisted safe fields');
  check(read('src/pages/ContactPage.tsx').includes('useSiteSettings') && read('src/components/layout/Footer.tsx').includes('useSiteSettings'), 'Contact and footer consume admin-managed settings');

  response = await handleAnalytics(new Request('https://test/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'anonymous-session-123456', eventName: 'page_view', accessToken: 'pt_forbidden' }) }), db);
  check(response.status === 201 && db.events.at(-1).customer_user_id === null, 'Anonymous page view is recorded without creating a customer identity');
  response = await handleAnalytics(new Request('https://test/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie2 }, body: JSON.stringify({ sessionId: 'customer-session-123456', eventName: 'tool_open', entityType: 'tool', entityId: 'word-counter' }) }), db);
  check(response.status === 201 && db.events.at(-1).customer_user_id === 1, 'Logged-in analytics event is associated server-side with the customer');
  check(!JSON.stringify(db.events).includes('pt_forbidden'), 'Analytics storage ignores access tokens and arbitrary request fields');
  await handleAnalytics(new Request('https://test/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: 'fake-revenue-session', eventName: 'payment_success', entityType: 'order', entityId: '999999999' }) }), db);
  const metrics = await getPlatformMetrics(db);
  check(metrics.revenue === 1200 + 999999, 'Revenue is calculated from paid D1 orders, never analytics events');
  check(db.events.find((event) => event.session_id === 'anonymous-session-123456').customer_user_id === null, 'Anonymous sessions remain anonymous records');
  response = await worker.fetch(new Request('https://test/api/admin/analytics'), env);
  check(response.status === 401, 'Admin analytics route requires an admin session');

  const css = read('src/index.css'); const theme = read('src/hooks/useTheme.ts');
  check(css.includes('@custom-variant dark') && theme.includes('useSyncExternalStore'), 'Dark mode uses one shared persisted class-based theme system');
  check(read('src/pages/ServicesPage.tsx').includes("t('services.why") && !read('src/i18n/locales/en/translation.json').includes('services.card.benefits'), 'Services redesign uses translated content instead of raw keys');

  console.log(`\n🎉 Consolidated improvements: ${passed}/${passed} passed`);
}

main().catch((error) => { console.error(error); process.exit(1); });
