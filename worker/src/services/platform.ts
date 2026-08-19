import { D1Database } from '../db/repository';

export const PUBLIC_SETTING_KEYS = [
  'site_name', 'tagline', 'short_description', 'support_email', 'whatsapp_number',
  'phone_number', 'location_text', 'business_hours', 'support_message',
  'purchase_support_email', 'service_enquiry_message', 'instagram_url', 'youtube_url',
  'github_url', 'linkedin_url',
  'ads_enabled', 'adsense_enabled', 'adsense_publisher_id', 'auto_ads_enabled',
  'ads_on_tools', 'ads_on_projects', 'ads_on_services',
  'adsense_tools_listing_slot_id', 'adsense_tool_content_slot_id',
  'adsense_project_content_slot_id', 'adsense_services_content_slot_id',
  'consent_provider_configured', 'consent_provider_name',
  'affiliate_enabled', 'affiliate_disclosure_text', 'premium_features_enabled',
] as const;

export type PublicSettingKey = typeof PUBLIC_SETTING_KEYS[number];
export type PublicSettings = Record<PublicSettingKey, string>;

export async function getPublicSettings(db: D1Database): Promise<PublicSettings> {
  const result = await db.prepare(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${PUBLIC_SETTING_KEYS.map(() => '?').join(',')})`
  ).bind(...PUBLIC_SETTING_KEYS).all<{ setting_key: PublicSettingKey; setting_value: string }>();
  const settings = Object.fromEntries(PUBLIC_SETTING_KEYS.map((key) => [key, ''])) as PublicSettings;
  for (const row of result.results || []) settings[row.setting_key] = row.setting_value || '';
  if (!settings.site_name) settings.site_name = 'Tools4Genz';
  return settings;
}

export async function updatePublicSettings(db: D1Database, input: Record<string, unknown>): Promise<PublicSettings> {
  const now = new Date().toISOString();
  const statements = PUBLIC_SETTING_KEYS.filter((key) => typeof input[key] === 'string').map((key) =>
    db.prepare(
      `INSERT INTO site_settings(setting_key, setting_value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_at = excluded.updated_at`
    ).bind(key, String(input[key]).trim().slice(0, 500), now)
  );
  if (statements.length) await db.batch(statements);
  return getPublicSettings(db);
}

const SAFE_EVENTS = new Set([
  'page_view', 'tool_open', 'project_view', 'service_view', 'request_started',
  'request_submitted', 'login_started', 'login_success', 'checkout_started',
  'payment_success', 'download_success', 'affiliate_click',
]);

export async function recordAnalyticsEvent(db: D1Database, data: {
  sessionId: string; customerUserId?: number | null; eventName: string; entityType?: string; entityId?: string;
}): Promise<boolean> {
  if (!SAFE_EVENTS.has(data.eventName) || !/^[A-Za-z0-9_-]{16,80}$/.test(data.sessionId)) return false;
  await db.prepare(
    `INSERT INTO analytics_events(session_id, customer_user_id, event_name, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    data.sessionId, data.customerUserId || null, data.eventName,
    data.entityType?.slice(0, 40) || null, data.entityId?.slice(0, 120) || null,
    new Date().toISOString()
  ).run();
  return true;
}

export async function getPlatformMetrics(db: D1Database) {
  const now = Date.now();
  const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
  const week = new Date(now - 7 * 86400000).toISOString();
  const active = new Date(now - 5 * 60000).toISOString();
  const scalar = async (sql: string, ...values: unknown[]) => (await db.prepare(sql).bind(...values).first<{ c: number }>())?.c || 0;
  const [visitorsToday, visitorsWeek, pageViews, anonymousSessions, activeSessions, registeredUsers, newUsersToday,
    totalRequests, pendingRequests, paidOrders, pendingOrders, failedOrders, revenue, readyDeliveries, pendingDeliveries, downloads,
    publishedAffiliateOffers, affiliateClicks] = await Promise.all([
    scalar(`SELECT COUNT(DISTINCT session_id) c FROM analytics_events WHERE created_at >= ?`, today),
    scalar(`SELECT COUNT(DISTINCT session_id) c FROM analytics_events WHERE created_at >= ?`, week),
    scalar(`SELECT COUNT(*) c FROM analytics_events WHERE event_name = 'page_view'`),
    scalar(`SELECT COUNT(DISTINCT session_id) c FROM analytics_events WHERE customer_user_id IS NULL`),
    scalar(`SELECT COUNT(DISTINCT session_id) c FROM analytics_events WHERE created_at >= ?`, active),
    scalar(`SELECT COUNT(*) c FROM customer_users`), scalar(`SELECT COUNT(*) c FROM customer_users WHERE created_at >= ?`, today),
    scalar(`SELECT COUNT(*) c FROM requests`), scalar(`SELECT COUNT(*) c FROM requests WHERE status IN ('new','pending')`),
    scalar(`SELECT COUNT(*) c FROM orders WHERE status = 'paid'`), scalar(`SELECT COUNT(*) c FROM orders WHERE status IN ('created','payment_pending')`),
    scalar(`SELECT COUNT(*) c FROM orders WHERE status = 'payment_failed'`), scalar(`SELECT COALESCE(SUM(amount),0) c FROM orders WHERE status = 'paid'`),
    scalar(`SELECT COUNT(*) c FROM digital_deliveries WHERE delivery_status = 'ready'`), scalar(`SELECT COUNT(*) c FROM digital_deliveries WHERE delivery_status = 'pending'`),
    scalar(`SELECT COALESCE(SUM(download_count),0) c FROM digital_deliveries`),
    scalar(`SELECT COUNT(*) c FROM affiliate_offers WHERE status = 'published'`),
    scalar(`SELECT COUNT(*) c FROM analytics_events WHERE event_name = 'affiliate_click'`),
  ]);
  const topContent = async (entityType: string) => (await db.prepare(
    `SELECT entity_id id, COUNT(*) count FROM analytics_events WHERE entity_type = ? AND entity_id IS NOT NULL GROUP BY entity_id ORDER BY count DESC LIMIT 5`
  ).bind(entityType).all<{ id: string; count: number }>()).results || [];
  return { visitorsToday, visitorsWeek, pageViews, anonymousSessions, activeSessions, registeredUsers, newUsersToday,
    totalRequests, pendingRequests, paidOrders, pendingOrders, failedOrders, revenue, readyDeliveries, pendingDeliveries, downloads,
    publishedAffiliateOffers, affiliateClicks,
    topTools: await topContent('tool'), topProjects: await topContent('project'), topServices: await topContent('service') };
}

export async function listCustomerUsers(db: D1Database) {
  const result = await db.prepare(
    `SELECT u.id, u.email_normalized email, u.display_name displayName, u.status, u.created_at createdAt,
            u.last_login_at lastLoginAt,
            (SELECT COUNT(*) FROM orders o WHERE o.customer_user_id = u.id) orderCount,
            (SELECT COALESCE(SUM(o.amount), 0) FROM orders o WHERE o.customer_user_id = u.id AND o.status = 'paid') totalPaid,
            (SELECT COUNT(*) FROM requests r WHERE LOWER(TRIM(r.email)) = u.email_normalized) requestCount,
            COALESCE(
              (SELECT MAX(a.created_at) FROM analytics_events a WHERE a.customer_user_id = u.id),
              (SELECT MAX(s.last_seen_at) FROM customer_sessions s WHERE s.user_id = u.id),
              u.last_login_at,
              u.created_at
            ) lastActivityAt
     FROM customer_users u ORDER BY u.created_at DESC LIMIT 200`
  ).all<Record<string, unknown>>();
  return result.results || [];
}
