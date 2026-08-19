import { adminToolRepository, D1Database } from '../db/repository';
import { clearCustomerSessionCookie, createLoginChallenge, currentCustomer, customerAuthEnabled, customerSessionCookie, revokeCustomerSession, verifyLoginChallenge } from '../services/customerAuth';
import { EmailBindings } from '../services/email/emailProvider';
import { getPlatformMetrics, getPublicSettings, listCustomerUsers, recordAnalyticsEvent, updatePublicSettings } from '../services/platform';
import { error, json, success } from '../utils/api';
import { BodyTooLargeError, readJsonBody } from '../utils/body';

const BUNDLED_NATIVE_IDS = new Set(['word-counter', 'character-counter', 'json-formatter', 'json-minifier', 'case-converter', 'percentage-calculator', 'random-text-generator', 'unit-converter']);

async function jsonRecord(request: Request): Promise<Record<string, unknown> | Response> {
  try { const value = await readJsonBody(request); return value && typeof value === 'object' ? value as Record<string, unknown> : {}; }
  catch (caught) { return caught instanceof BodyTooLargeError
    ? error('PAYLOAD_TOO_LARGE', 'Request body is too large', 413)
    : error('BAD_JSON', 'Invalid JSON body', 400); }
}

function safeTool(row: { id: string; slug: string; name: string; category: string; status: string; featured: number; data: string }) {
  let parsed: Record<string, unknown> = {}; try { parsed = JSON.parse(row.data); } catch { /* safe defaults */ }
  const rawConfig = parsed.integrationConfig && typeof parsed.integrationConfig === 'object' ? parsed.integrationConfig as Record<string, unknown> : {};
  const type = typeof parsed.integration === 'string' ? parsed.integration : String(rawConfig.type || 'native');
  if (type === 'native' && !BUNDLED_NATIVE_IDS.has(row.id)) return null;
  const integrationConfig = type === 'external-url'
    ? { type, url: rawConfig.url, openMode: rawConfig.openMode === 'same-tab' ? 'same-tab' : 'new-tab' }
    : type === 'embedded'
      ? { type, url: rawConfig.url, sandbox: rawConfig.sandbox }
      : type === 'worker-api'
        ? { type, endpoint: rawConfig.endpoint, method: rawConfig.method }
        : type === 'external-api'
          ? { type, endpointId: rawConfig.endpointId, method: rawConfig.method }
          : { type: 'native' };
  return {
    id: row.id, slug: row.slug, name: row.name, category: row.category, status: row.status,
    featured: Boolean(row.featured), integration: type, integrationConfig,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    longDescription: typeof parsed.longDescription === 'string' ? parsed.longDescription : undefined,
    icon: typeof parsed.icon === 'string' ? parsed.icon : undefined,
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 30) : [],
    searchKeywords: Array.isArray(parsed.searchKeywords) ? parsed.searchKeywords.filter((keyword): keyword is string => typeof keyword === 'string').slice(0, 30) : [],
    sortOrder: typeof parsed.sortOrder === 'number' ? parsed.sortOrder : 0,
    allowEmbed: parsed.allowEmbed === true,
    accessTier: parsed.accessTier === 'premium' || parsed.accessTier === 'coming-soon' ? parsed.accessTier : 'free',
    seo: parsed.seo && typeof parsed.seo === 'object' ? {
      title: typeof (parsed.seo as Record<string, unknown>).title === 'string' ? (parsed.seo as Record<string, unknown>).title : '',
      description: typeof (parsed.seo as Record<string, unknown>).description === 'string' ? (parsed.seo as Record<string, unknown>).description : '',
      keywords: Array.isArray((parsed.seo as Record<string, unknown>).keywords) ? (parsed.seo as Record<string, unknown>).keywords : [],
    } : undefined,
  };
}

export async function handleGetPublicTools(db: D1Database) {
  const rows = await adminToolRepository.getAll(db);
  return success(rows.filter((row) => ['active', 'beta', 'coming-soon'].includes(row.status)).map(safeTool).filter(Boolean));
}
export async function validateAdminToolPayload(db: D1Database, body: Record<string, unknown>, existingId?: string): Promise<Response | null> {
  const slug = String(body.slug || '').trim().toLowerCase(); const id = existingId || String(body.id || '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return error('VALIDATION_ERROR', 'A valid unique slug is required', 400);
  const duplicate = await db.prepare(`SELECT id FROM admin_tools WHERE slug = ? AND id != ? LIMIT 1`).bind(slug, id).first<{ id: string }>();
  if (duplicate) return error('VALIDATION_ERROR', 'Tool slug is already in use', 409);
  const integrationType = typeof body.integration === 'string' ? body.integration : body.integration && typeof body.integration === 'object' ? String((body.integration as Record<string, unknown>).type || 'native') : 'native';
  if (integrationType === 'native' && !BUNDLED_NATIVE_IDS.has(id)) return error('VALIDATION_ERROR', 'New native React tools require a frontend deployment. Choose an external or API integration.', 400);
  const config = body.integrationConfig && typeof body.integrationConfig === 'object' ? body.integrationConfig as Record<string, unknown> : {};
  if (body.accessTier !== undefined && !['free', 'premium', 'coming-soon'].includes(String(body.accessTier))) return error('VALIDATION_ERROR', 'Unsupported tool access tier', 400);
  if (integrationType === 'external-url' || integrationType === 'embedded') {
    try { const url = new URL(String(config.url || '')); if (url.protocol !== 'https:') throw new Error('unsafe'); }
    catch { return error('VALIDATION_ERROR', 'External and embedded tools require a valid HTTPS URL', 400); }
  }
  if (integrationType === 'worker-api' && !String(config.endpoint || '').startsWith('/api/')) return error('VALIDATION_ERROR', 'Worker endpoints must use a relative /api/ path', 400);
  if (integrationType === 'external-api' && !/^[a-z0-9_-]{2,80}$/i.test(String(config.endpointId || ''))) return error('VALIDATION_ERROR', 'External API tools require a safe configured endpoint identifier', 400);
  return null;
}

export async function handleGetPublicSettings(db: D1Database) { return success(await getPublicSettings(db)); }
export async function handleUpdateSettings(request: Request, db: D1Database) {
  const parsed = await jsonRecord(request); if (parsed instanceof Response) return parsed; const body = parsed;
  const publisherId = typeof body.adsense_publisher_id === 'string' ? body.adsense_publisher_id.trim() : '';
  if (publisherId && !/^ca-pub-\d{16}$/.test(publisherId)) return error('VALIDATION_ERROR', 'AdSense publisher ID must use the ca-pub- plus 16 digits format.', 400);
  for (const key of ['adsense_tools_listing_slot_id', 'adsense_tool_content_slot_id', 'adsense_project_content_slot_id', 'adsense_services_content_slot_id']) {
    const value = typeof body[key] === 'string' ? body[key].trim() : '';
    if (value && !/^\d{5,30}$/.test(value)) return error('VALIDATION_ERROR', 'Ad slot IDs must contain 5 to 30 digits.', 400);
  }
  const booleanKeys = ['ads_enabled', 'adsense_enabled', 'auto_ads_enabled', 'ads_on_tools', 'ads_on_projects',
    'ads_on_services', 'consent_provider_configured', 'affiliate_enabled', 'premium_features_enabled'];
  for (const key of booleanKeys) if (typeof body[key] === 'boolean') body[key] = body[key] ? 'true' : 'false';
  if (!publisherId) body.adsense_enabled = 'false';
  return success(await updatePublicSettings(db, body));
}

export async function handleCustomerAuthStatus(request: Request, db: D1Database, env: EmailBindings) {
  const user = customerAuthEnabled(env) ? await currentCustomer(request, db) : null;
  return success({ enabled: customerAuthEnabled(env), user });
}
export async function handleCustomerLoginStart(request: Request, db: D1Database, env: EmailBindings) {
  if (!customerAuthEnabled(env)) return error('FEATURE_NOT_ENABLED', 'Customer login will be available after email verification is configured.', 503);
  const parsed = await jsonRecord(request); if (parsed instanceof Response) return parsed; const body = parsed;
  const result = await createLoginChallenge(db, String(body.email || ''), env);
  if (result === 'invalid') return error('VALIDATION_ERROR', 'Enter a valid email address', 400);
  if (result !== 'sent') return error('FEATURE_NOT_ENABLED', 'Customer login is not configured.', 503);
  return json({ success: true, message: 'If the address is valid, a login code has been sent.' }, 202);
}
export async function handleCustomerLoginVerify(request: Request, db: D1Database, env: EmailBindings) {
  if (!customerAuthEnabled(env)) return error('FEATURE_NOT_ENABLED', 'Customer login is not configured.', 503);
  const parsed = await jsonRecord(request); if (parsed instanceof Response) return parsed; const body = parsed;
  const result = await verifyLoginChallenge(db, String(body.email || ''), String(body.code || ''));
  if (!result.ok) return error(result.reason === 'expired' ? 'LOGIN_CODE_EXPIRED' : 'LOGIN_CODE_INVALID', result.reason === 'expired' ? 'This login code has expired.' : 'The login code is invalid or already used.', 400);
  return json({ success: true, data: { user: result.user } }, 200, { 'Set-Cookie': customerSessionCookie(result.token) });
}
export async function handleCustomerLogout(request: Request, db: D1Database) {
  await revokeCustomerSession(request, db); return json({ success: true, data: { loggedOut: true } }, 200, { 'Set-Cookie': clearCustomerSessionCookie() });
}
export async function handleCustomerOrders(request: Request, db: D1Database) {
  const user = await currentCustomer(request, db); if (!user) return error('CUSTOMER_AUTH_REQUIRED', 'Customer login is required.', 401);
  const rows = await db.prepare(`SELECT order_id orderId, project_id projectId, project_title projectTitle, amount, currency, status, paid_at paidAt, created_at createdAt, delivery_status deliveryStatus FROM orders WHERE customer_user_id = ? ORDER BY created_at DESC LIMIT 200`).bind(user.id).all<Record<string, unknown>>();
  return success(rows.results || []);
}
export async function handleAnalytics(request: Request, db: D1Database) {
  const parsed = await jsonRecord(request); if (parsed instanceof Response) return parsed; const body = parsed;
  const user = await currentCustomer(request, db);
  const recorded = await recordAnalyticsEvent(db, { sessionId: String(body.sessionId || ''), customerUserId: user?.id, eventName: String(body.eventName || ''), entityType: typeof body.entityType === 'string' ? body.entityType : undefined, entityId: typeof body.entityId === 'string' ? body.entityId : undefined });
  return recorded ? success({ recorded: true }, 201) : error('VALIDATION_ERROR', 'Unsupported analytics event', 400);
}
export async function handleAdminPlatformMetrics(db: D1Database) { return success(await getPlatformMetrics(db)); }
export async function handleAdminCustomerUsers(db: D1Database) { return success(await listCustomerUsers(db)); }
export async function handleAdminCustomerStatus(request: Request, userId: string, db: D1Database) {
  const parsed = await jsonRecord(request); if (parsed instanceof Response) return parsed; const body = parsed;
  const status = body.status === 'disabled' ? 'disabled' : body.status === 'active' ? 'active' : '';
  if (!status) return error('VALIDATION_ERROR', 'Status must be active or disabled', 400);
  const result = await db.prepare(`UPDATE customer_users SET status = ?, updated_at = ? WHERE id = ?`).bind(status, new Date().toISOString(), Number(userId)).run();
  return result.meta.changes ? success({ updated: true }) : error('NOT_FOUND', 'Customer not found', 404);
}
