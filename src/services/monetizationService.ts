import { API_BASE_URL } from '@/config/api';
import { anonymousSessionId } from '@/services/platformService';

const base = `${API_BASE_URL}/api`;
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`);
  return (body.data ?? body) as T;
}

export type AffiliateStatus = 'draft' | 'published' | 'hidden' | 'archived';
export interface AffiliateOffer {
  id: number; title: string; slug: string; description: string; destinationUrl: string;
  category: string; imageUrl: string | null; ctaText: string; disclosureText: string | null;
  featured: boolean; entityType: string | null; entityId: string | null;
  status?: AffiliateStatus; sortOrder?: number; createdAt?: string; updatedAt?: string;
}
export type AffiliateOfferInput = Omit<AffiliateOffer, 'id' | 'createdAt' | 'updatedAt'>;

export const monetizationService = {
  publicOffers(entityType?: string, entityId?: string) {
    const query = new URLSearchParams(); if (entityType) query.set('entityType', entityType); if (entityId) query.set('entityId', entityId);
    return request<AffiliateOffer[]>(`/affiliate-offers${query.size ? `?${query}` : ''}`);
  },
  trackClick(id: number) { return request(`/affiliate-offers/${id}/click`, { method: 'POST', body: JSON.stringify({ sessionId: anonymousSessionId() }) }); },
  adminList() { return request<AffiliateOffer[]>('/admin/affiliate-offers'); },
  create(input: AffiliateOfferInput) { return request<AffiliateOffer>('/admin/affiliate-offers', { method: 'POST', body: JSON.stringify(input) }); },
  update(id: number, input: AffiliateOfferInput) { return request<AffiliateOffer>(`/admin/affiliate-offers/${id}`, { method: 'PUT', body: JSON.stringify(input) }); },
  archive(id: number) { return request(`/admin/affiliate-offers/${id}`, { method: 'DELETE' }); },
};
