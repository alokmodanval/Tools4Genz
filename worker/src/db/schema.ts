/**
 * D1 database schema definitions and row types for the Tools4Genz Worker.
 */

// ============================================================
// Requests Table (Phase 5)
// ============================================================
export interface RequestRow {
  /** Internal numeric primary key */
  id: number;
  /** Public unique request reference, e.g. TG-REQ-XXXXXXXX */
  request_id: string;
  request_type: string;
  /** Lifecycle status: submitted | reviewing | in_progress | completed | rejected */
  status: string;

  // Contact
  name: string;
  email: string;
  phone: string | null;
  preferred_contact: string | null;

  // Project detail
  project_type: string;
  technology: string | null;
  project_title: string | null;
  description: string;

  // Budget & timeline
  budget: string | null;
  deadline: string | null;
  additional_notes: string | null;

  // Student-specific
  course: string | null;
  branch: string | null;
  academic_year: string | null;
  college_name: string | null;

  // Client-specific
  company: string | null;
  website_url: string | null;
  reference_website: string | null;
  existing_system: string | null;

  created_at: string;
  updated_at: string;
}

export const REQUEST_INSERT_COLUMNS = `
  request_id, request_type, status,
  name, email, phone, preferred_contact,
  project_type, technology, project_title, description,
  budget, deadline, additional_notes,
  course, branch, academic_year, college_name,
  company, website_url, reference_website, existing_system,
  created_at, updated_at
`;

export const REQUEST_INSERT_PLACEHOLDERS = `
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?
`;

// ============================================================
// Admin Users & Sessions (Phase 7)
// ============================================================
export interface AdminUserRow {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSessionRow {
  id: number;
  admin_user_id: number;
  session_token: string;
  session_token_hash?: string | null;
  expires_at: string;
  created_at: string;
  last_seen_at: string;
}

// ============================================================
// Content Tables (Tools, Projects, Services, Categories)
// ============================================================
export interface AdminToolRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  featured: number; // 0 or 1
  data: string; // JSON string of Tool (including integration, SEO, capabilities, etc.)
  created_at: string;
  updated_at: string;
}

export interface AdminProjectRow {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  featured: number; // 0 or 1
  data: string; // JSON string of Project
  created_at: string;
  updated_at: string;
}

export interface AdminServiceRow {
  id: string;
  title: string;
  category: string;
  data: string; // JSON string of Service
  created_at: string;
  updated_at: string;
}

export interface AdminCategoryRow {
  id: string;
  type: string; // 'tool' | 'project' | 'service'
  name: string;
  icon: string | null;
  count: number;
  data: string | null; // Optional JSON metadata
  created_at: string;
  updated_at: string;
}

// ============================================================
// Orders Table (Phase 8A)
// ============================================================
export interface OrderRow {
  /** Internal numeric primary key */
  id: number;
  /** Public unique order reference, e.g. TG-ORD-XXXXXXXX */
  order_id: string;
  project_id: string;
  project_slug: string;
  project_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount: number;
  currency: string;
  /** Status: created | payment_pending | paid | payment_failed | cancelled | refunded */
  status: string;
  payment_provider: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  provider_signature: string | null;
  qr_id?: string | null;
  qr_image_url?: string | null;
  qr_status?: string | null;
  qr_close_by?: number | null;
  qr_created_at?: string | null;
  /** Phase 9: Link to digital_deliveries row (set once delivery is prepared) */
  delivery_id?: number | null;
  /** Phase 9: Cached delivery status copied from digital_deliveries.delivery_status */
  delivery_status?: string | null;
  /** Phase 9: Project id the delivery artifact belongs to (server-authoritative) */
  delivery_project_id?: string | null;
  /** Phase 11: SHA-256 of the 256-bit guest purchase token. Raw token is never stored. */
  access_token_hash?: string | null;
  access_token_created_at?: string | null;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ORDER_INSERT_COLUMNS = `
  order_id, project_id, project_slug, project_title,
  customer_name, customer_email, customer_phone,
  amount, currency, status, payment_provider,
  provider_order_id, provider_payment_id, provider_signature,
  notes, paid_at, created_at, updated_at,
  access_token_hash, access_token_created_at
`;

export const ORDER_INSERT_PLACEHOLDERS = `
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?
`;

// ============================================================
// Payment Webhook Events Table (Phase 8B)
// ============================================================
export interface PaymentWebhookEventRow {
  id: number;
  provider: string;
  event_id: string;
  event_type: string;
  provider_order_id: string | null;
  provider_payment_id: string | null;
  order_id: string | null;
  amount: number | null;
  currency: string | null;
  payload_hash: string | null;
  processed_status: 'received' | 'processing' | 'processed' | 'ignored' | 'failed' | string;
  processing_error: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
}

export const PAYMENT_WEBHOOK_EVENT_INSERT_COLUMNS = `
  provider, event_id, event_type,
  provider_order_id, provider_payment_id, order_id,
  amount, currency, payload_hash,
  processed_status, processing_error,
  received_at, processed_at, created_at
`;

export const PAYMENT_WEBHOOK_EVENT_INSERT_PLACEHOLDERS = `
  ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?,
  ?, ?,
  ?, ?, ?
`;

// ============================================================
// Digital Deliveries Table (Phase 9)
// ============================================================
export interface DigitalDeliveryRow {
  id: number;
  order_id: string;
  project_id: string;
  /** Lifecycle status: pending | ready | failed */
  delivery_status: string;
  /** Unique access key for this delivery */
  delivery_key: string;
  download_count: number;
  last_download_at: string | null;
  created_at: string;
  updated_at: string;
  file_size: number | null;
  sha256: string | null;
  /** Phase 10: Shared project release used by this delivery; null for legacy deliveries. */
  release_id: number | null;
}

export const DIGITAL_DELIVERY_INSERT_COLUMNS = `
  order_id, project_id, delivery_status, delivery_key,
  download_count, last_download_at, created_at, updated_at,
  file_size, sha256, release_id
`;

export const DIGITAL_DELIVERY_INSERT_PLACEHOLDERS = `
  ?, ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?
`;

// ============================================================
// Project Releases Table (Phase 10)
// ============================================================
export type ProjectReleaseStatus = 'draft' | 'ready' | 'published' | 'archived';

export interface ProjectReleaseRow {
  id: number;
  project_id: string;
  version: string;
  r2_key: string;
  filename: string;
  content_type: string;
  file_size: number;
  sha256: string;
  status: ProjectReleaseStatus | string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  /** Active private storage adapter. Existing rows default to r2; MVP uploads use kv. */
  storage_provider: 'kv' | 'r2' | string;
}

export const PROJECT_RELEASE_INSERT_COLUMNS = `
  project_id, version, r2_key, filename, content_type,
  file_size, sha256, status, created_at, updated_at, published_at,
  storage_provider
`;

export const PROJECT_RELEASE_INSERT_PLACEHOLDERS = `
  ?, ?, ?, ?, ?,
  ?, ?, ?, ?, ?, ?,
  ?
`;

// ============================================================
// Transactional Email & Purchase Recovery (Phase 12)
// ============================================================
export interface TransactionalEmailEventRow {
  id: number;
  order_id: string | null;
  email_type: 'receipt' | 'recovery' | string;
  dedupe_key: string;
  provider: string;
  provider_message_id: string | null;
  status: 'processing' | 'sent' | 'failed' | string;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  updated_at: string;
}

export interface PurchaseRecoveryRequestRow {
  id: number;
  request_id: string;
  email_hash: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRecoveryTokenRow {
  id: number;
  request_id: string;
  order_id: string;
  token_hash: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// ============================================================
// Affiliate Offers (Phase 15)
// ============================================================
export type AffiliateOfferStatus = 'draft' | 'published' | 'hidden' | 'archived';

export interface AffiliateOfferRow {
  id: number;
  title: string;
  slug: string;
  description: string;
  destination_url: string;
  category: string;
  image_url: string | null;
  cta_text: string;
  disclosure_text: string | null;
  status: AffiliateOfferStatus | string;
  featured: number;
  sort_order: number;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}
