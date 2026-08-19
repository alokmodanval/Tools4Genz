import { API_BASE_URL } from '@/config/api';
import { ToolDefinition } from '@/types/tool';
import { toolRegistry } from '@/tools/registry';

const base = `${API_BASE_URL}/api`;
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`);
  return (body.data ?? body) as T;
}

export interface SiteSettings {
  site_name: string; tagline: string; short_description: string; support_email: string;
  whatsapp_number: string; phone_number: string; location_text: string; business_hours: string;
  support_message: string; purchase_support_email: string; service_enquiry_message: string;
  instagram_url: string; youtube_url: string; github_url: string; linkedin_url: string;
  ads_enabled: string; adsense_enabled: string; adsense_publisher_id: string; auto_ads_enabled: string;
  ads_on_tools: string; ads_on_projects: string; ads_on_services: string;
  adsense_tools_listing_slot_id: string; adsense_tool_content_slot_id: string;
  adsense_project_content_slot_id: string; adsense_services_content_slot_id: string;
  consent_provider_configured: string; consent_provider_name: string;
  affiliate_enabled: string; affiliate_disclosure_text: string; premium_features_enabled: string;
}
export const defaultSiteSettings: SiteSettings = {
  site_name: 'Tools4Genz', tagline: 'Smart tools, projects and digital solutions',
  short_description: 'Practical tools and software solutions for students, creators and businesses.',
  support_email: '', whatsapp_number: '', phone_number: '', location_text: '', business_hours: '', support_message: '',
  purchase_support_email: '', service_enquiry_message: '', instagram_url: '', youtube_url: '', github_url: '', linkedin_url: '',
  ads_enabled: 'false', adsense_enabled: 'false', adsense_publisher_id: '', auto_ads_enabled: 'false',
  ads_on_tools: 'false', ads_on_projects: 'false', ads_on_services: 'false',
  adsense_tools_listing_slot_id: '', adsense_tool_content_slot_id: '', adsense_project_content_slot_id: '', adsense_services_content_slot_id: '',
  consent_provider_configured: 'false', consent_provider_name: '', affiliate_enabled: 'false',
  affiliate_disclosure_text: 'Some recommendations may be sponsored or use affiliate links. Tools4Genz may earn a commission without increasing your price.',
  premium_features_enabled: 'false',
};

export const platformService = {
  async publicTools(): Promise<ToolDefinition[]> {
    try {
      const rows = await request<ToolDefinition[]>('/tools');
      if (!rows.length) return toolRegistry;
      return rows.map((row) => {
        const bundled = toolRegistry.find((tool) => tool.id === row.id);
        return bundled ? { ...bundled, ...row, component: bundled.component } : row;
      }).sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
    } catch { return toolRegistry; }
  },
  async settings(): Promise<SiteSettings> {
    try { return { ...defaultSiteSettings, ...await request<Partial<SiteSettings>>('/site-settings/public') }; }
    catch { return defaultSiteSettings; }
  },
  async authStatus() { try { return await request<{ enabled: boolean; user: CustomerUser | null }>('/customer-auth/status'); } catch { return { enabled: false, user: null }; } },
  startLogin(email: string) { return request('/customer-auth/start', { method: 'POST', body: JSON.stringify({ email }) }); },
  verifyLogin(email: string, code: string) { return request<{ user: CustomerUser }>('/customer-auth/verify', { method: 'POST', body: JSON.stringify({ email, code }) }); },
  logout() { return request('/customer-auth/logout', { method: 'POST' }); },
  customerOrders() { return request<CustomerOrder[]>('/customer/orders'); },
  adminSettings() { return request<SiteSettings>('/admin/settings'); },
  updateSettings(settings: SiteSettings) { return request<SiteSettings>('/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }); },
  adminAnalytics() { return request<PlatformMetrics>('/admin/analytics'); },
  adminUsers() { return request<AdminCustomer[]>('/admin/users'); },
  updateCustomerStatus(id: number, status: 'active' | 'disabled') { return request(`/admin/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); },
};

export interface CustomerUser { id: number; email: string; displayName: string | null; status: string }
export interface CustomerOrder { orderId: string; projectId: string; projectTitle: string; amount: number; currency: string; status: string; paidAt: string | null; createdAt: string; deliveryStatus: string | null }
export interface AdminCustomer { id: number; email: string; displayName: string | null; status: string; createdAt: string; lastLoginAt: string | null; lastActivityAt: string | null; orderCount: number; requestCount: number; totalPaid: number }
export interface PlatformMetrics { visitorsToday: number; visitorsWeek: number; pageViews: number; anonymousSessions: number; activeSessions: number; registeredUsers: number; newUsersToday: number; totalRequests: number; pendingRequests: number; paidOrders: number; pendingOrders: number; failedOrders: number; revenue: number; readyDeliveries: number; pendingDeliveries: number; downloads: number; publishedAffiliateOffers: number; affiliateClicks: number; topTools: Array<{id:string;count:number}>; topProjects: Array<{id:string;count:number}>; topServices: Array<{id:string;count:number}> }

export function anonymousSessionId() {
  const key = 't4g_anonymous_session'; let value = localStorage.getItem(key);
  if (!value) { const bytes = new Uint8Array(18); crypto.getRandomValues(bytes); value = `anon_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`; localStorage.setItem(key, value); }
  return value;
}
export function trackEvent(eventName: string, entityType?: string, entityId?: string) {
  const body = { sessionId: anonymousSessionId(), eventName, entityType, entityId };
  void fetch(`${base}/analytics/events`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);
}
