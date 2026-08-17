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
  notes, paid_at, created_at, updated_at
`;

export const ORDER_INSERT_PLACEHOLDERS = `
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?, ?
`;