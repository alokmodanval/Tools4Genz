import {
  AdminCategoryRow,
  AdminProjectRow,
  AdminServiceRow,
  AdminSessionRow,
  AdminToolRow,
  AdminUserRow,
  ORDER_INSERT_COLUMNS,
  ORDER_INSERT_PLACEHOLDERS,
  OrderRow,
  REQUEST_INSERT_COLUMNS,
  REQUEST_INSERT_PLACEHOLDERS,
  RequestRow,
} from './schema';

/**
 * Typed D1 binding interface.
 */
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

// ============================================================
// Requests Repository
// ============================================================
export const requestRepository = {
  async insert(db: D1Database, row: Omit<RequestRow, 'id'>): Promise<number> {
    const result = await db
      .prepare(
        `INSERT INTO requests (${REQUEST_INSERT_COLUMNS})
         VALUES (${REQUEST_INSERT_PLACEHOLDERS})`
      )
      .bind(
        row.request_id,
        row.request_type,
        row.status,
        row.name,
        row.email,
        row.phone,
        row.preferred_contact,
        row.project_type,
        row.technology,
        row.project_title,
        row.description,
        row.budget,
        row.deadline,
        row.additional_notes,
        row.course,
        row.branch,
        row.academic_year,
        row.college_name,
        row.company,
        row.website_url,
        row.reference_website,
        row.existing_system,
        row.created_at,
        row.updated_at
      )
      .run();

    return result.meta.last_row_id;
  },

  async findPublicStatus(
    db: D1Database,
    requestId: string
  ): Promise<Pick<RequestRow, 'request_id' | 'status' | 'created_at'> | null> {
    return db
      .prepare(
        `SELECT request_id, status, created_at
         FROM requests
         WHERE request_id = ?
         LIMIT 1`
      )
      .bind(requestId)
      .first<Pick<RequestRow, 'request_id' | 'status' | 'created_at'>>();
  },

  async findAllAdmin(db: D1Database): Promise<RequestRow[]> {
    const res = await db
      .prepare(
        `SELECT * FROM requests ORDER BY created_at DESC`
      )
      .all<RequestRow>();
    return res.results || [];
  },

  async findByIdAdmin(db: D1Database, requestId: string): Promise<RequestRow | null> {
    return db
      .prepare(
        `SELECT * FROM requests WHERE request_id = ? LIMIT 1`
      )
      .bind(requestId)
      .first<RequestRow>();
  },

  async updateStatusAdmin(
    db: D1Database,
    requestId: string,
    status: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE requests SET status = ?, updated_at = ? WHERE request_id = ?`
      )
      .bind(status, now, requestId)
      .run();
    return res.meta.changes > 0;
  },
};

// ============================================================
// Admin Users Repository
// ============================================================
export const adminUserRepository = {
  async findByEmail(db: D1Database, email: string): Promise<AdminUserRow | null> {
    return db
      .prepare(
        `SELECT * FROM admin_users WHERE LOWER(email) = LOWER(?) LIMIT 1`
      )
      .bind(email)
      .first<AdminUserRow>();
  },

  async findById(db: D1Database, id: number): Promise<AdminUserRow | null> {
    return db
      .prepare(
        `SELECT * FROM admin_users WHERE id = ? LIMIT 1`
      )
      .bind(id)
      .first<AdminUserRow>();
  },

  async updateLastLogin(db: D1Database, id: number): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?`
      )
      .bind(now, now, id)
      .run();
  },

  async create(
    db: D1Database,
    user: { email: string; password_hash: string; role?: string }
  ): Promise<number> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `INSERT INTO admin_users (email, password_hash, role, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?)`
      )
      .bind(user.email.toLowerCase(), user.password_hash, user.role || 'admin', now, now)
      .run();
    return res.meta.last_row_id;
  },

  async count(db: D1Database): Promise<number> {
    const res = await db
      .prepare(`SELECT COUNT(*) as count FROM admin_users`)
      .first<{ count: number }>();
    return res?.count || 0;
  },
};

// ============================================================
// Admin Sessions Repository
// ============================================================
export const adminSessionRepository = {
  async create(
    db: D1Database,
    session: { admin_user_id: number; session_token: string; expires_at: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_sessions (admin_user_id, session_token, expires_at, created_at, last_seen_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(session.admin_user_id, session.session_token, session.expires_at, now, now)
      .run();
  },

  async findValidSession(
    db: D1Database,
    token: string
  ): Promise<(AdminSessionRow & { email: string; role: string; user_status: string }) | null> {
    const now = new Date().toISOString();
    return db
      .prepare(
        `SELECT s.*, u.email, u.role, u.status as user_status
         FROM admin_sessions s
         JOIN admin_users u ON s.admin_user_id = u.id
         WHERE s.session_token = ? AND s.expires_at > ? AND u.status = 'active'
         LIMIT 1`
      )
      .bind(token, now)
      .first<AdminSessionRow & { email: string; role: string; user_status: string }>();
  },

  async updateLastSeen(db: D1Database, id: number): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(`UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();
  },

  async deleteByToken(db: D1Database, token: string): Promise<void> {
    await db
      .prepare(`DELETE FROM admin_sessions WHERE session_token = ?`)
      .bind(token)
      .run();
  },
};

// ============================================================
// Admin Tools Repository
// ============================================================
export const adminToolRepository = {
  async getAll(db: D1Database): Promise<AdminToolRow[]> {
    const res = await db
      .prepare(`SELECT * FROM admin_tools ORDER BY created_at DESC`)
      .all<AdminToolRow>();
    return res.results || [];
  },

  async getById(db: D1Database, id: string): Promise<AdminToolRow | null> {
    return db
      .prepare(`SELECT * FROM admin_tools WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<AdminToolRow>();
  },

  async upsert(db: D1Database, tool: {
    id: string;
    slug: string;
    name: string;
    category: string;
    status: string;
    featured: number;
    data: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_tools (id, slug, name, category, status, featured, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           slug = excluded.slug,
           name = excluded.name,
           category = excluded.category,
           status = excluded.status,
           featured = excluded.featured,
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
      .bind(
        tool.id,
        tool.slug,
        tool.name,
        tool.category,
        tool.status,
        tool.featured,
        tool.data,
        now,
        now
      )
      .run();
  },

  async delete(db: D1Database, id: string): Promise<boolean> {
    const res = await db
      .prepare(`DELETE FROM admin_tools WHERE id = ?`)
      .bind(id)
      .run();
    return res.meta.changes > 0;
  },

  async count(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM admin_tools`).first<{ c: number }>();
    return res?.c || 0;
  },
};

// ============================================================
// Admin Projects Repository
// ============================================================
export const adminProjectRepository = {
  async getAll(db: D1Database): Promise<AdminProjectRow[]> {
    const res = await db
      .prepare(`SELECT * FROM admin_projects ORDER BY created_at DESC`)
      .all<AdminProjectRow>();
    return res.results || [];
  },

  async getById(db: D1Database, id: string): Promise<AdminProjectRow | null> {
    return db
      .prepare(`SELECT * FROM admin_projects WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<AdminProjectRow>();
  },

  async upsert(db: D1Database, project: {
    id: string;
    slug: string;
    title: string;
    category: string;
    status: string;
    featured: number;
    data: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_projects (id, slug, title, category, status, featured, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           slug = excluded.slug,
           title = excluded.title,
           category = excluded.category,
           status = excluded.status,
           featured = excluded.featured,
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
      .bind(
        project.id,
        project.slug,
        project.title,
        project.category,
        project.status,
        project.featured,
        project.data,
        now,
        now
      )
      .run();
  },

  async delete(db: D1Database, id: string): Promise<boolean> {
    const res = await db
      .prepare(`DELETE FROM admin_projects WHERE id = ?`)
      .bind(id)
      .run();
    return res.meta.changes > 0;
  },

  async count(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM admin_projects`).first<{ c: number }>();
    return res?.c || 0;
  },
};

// ============================================================
// Admin Services Repository
// ============================================================
export const adminServiceRepository = {
  async getAll(db: D1Database): Promise<AdminServiceRow[]> {
    const res = await db
      .prepare(`SELECT * FROM admin_services ORDER BY created_at DESC`)
      .all<AdminServiceRow>();
    return res.results || [];
  },

  async getById(db: D1Database, id: string): Promise<AdminServiceRow | null> {
    return db
      .prepare(`SELECT * FROM admin_services WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<AdminServiceRow>();
  },

  async upsert(db: D1Database, svc: {
    id: string;
    title: string;
    category: string;
    data: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_services (id, title, category, data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           category = excluded.category,
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
      .bind(svc.id, svc.title, svc.category, svc.data, now, now)
      .run();
  },

  async delete(db: D1Database, id: string): Promise<boolean> {
    const res = await db
      .prepare(`DELETE FROM admin_services WHERE id = ?`)
      .bind(id)
      .run();
    return res.meta.changes > 0;
  },

  async count(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM admin_services`).first<{ c: number }>();
    return res?.c || 0;
  },
};

// ============================================================
// Admin Categories Repository
// ============================================================
export const adminCategoryRepository = {
  async getAll(db: D1Database): Promise<AdminCategoryRow[]> {
    const res = await db
      .prepare(`SELECT * FROM admin_categories ORDER BY type ASC, name ASC`)
      .all<AdminCategoryRow>();
    return res.results || [];
  },

  async upsert(db: D1Database, cat: {
    id: string;
    type: string;
    name: string;
    icon: string | null;
    count: number;
    data?: string | null;
  }): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_categories (id, type, name, icon, "count", data, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id, type) DO UPDATE SET
           name = excluded.name,
           icon = excluded.icon,
           "count" = excluded."count",
           data = excluded.data,
           updated_at = excluded.updated_at`
      )
      .bind(cat.id, cat.type, cat.name, cat.icon || null, cat.count, cat.data || null, now, now)
      .run();
  },

  async delete(db: D1Database, id: string, type?: string): Promise<boolean> {
    if (type) {
      const res = await db
        .prepare(`DELETE FROM admin_categories WHERE id = ? AND type = ?`)
        .bind(id, type)
        .run();
      return res.meta.changes > 0;
    }
    const res = await db
      .prepare(`DELETE FROM admin_categories WHERE id = ?`)
      .bind(id)
      .run();
    return res.meta.changes > 0;
  },

  async count(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM admin_categories`).first<{ c: number }>();
    return res?.c || 0;
  },
};

// ============================================================
// Admin Dashboard Metrics
// ============================================================
export const adminMetricsRepository = {
  async getMetrics(db: D1Database): Promise<{
    totalTools: number;
    activeTools: number;
    totalProjects: number;
    featuredProjects: number;
    pendingRequests: number;
    completedRequests: number;
    totalServices: number;
  }> {
    const [toolsRes, activeToolsRes, projectsRes, featuredProjRes, pendingReqRes, completedReqRes, svcRes] =
      await Promise.all([
        db.prepare(`SELECT COUNT(*) as c FROM admin_tools`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM admin_tools WHERE status = 'active'`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM admin_projects`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM admin_projects WHERE featured = 1`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM requests WHERE status IN ('submitted', 'reviewing')`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM requests WHERE status = 'completed'`).first<{ c: number }>(),
        db.prepare(`SELECT COUNT(*) as c FROM admin_services`).first<{ c: number }>(),
      ]);

    return {
      totalTools: toolsRes?.c || 0,
      activeTools: activeToolsRes?.c || 0,
      totalProjects: projectsRes?.c || 0,
      featuredProjects: featuredProjRes?.c || 0,
      pendingRequests: pendingReqRes?.c || 0,
      completedRequests: completedReqRes?.c || 0,
      totalServices: svcRes?.c || 0,
    };
  },
};

// ============================================================
// Orders Repository (Phase 8A)
// ============================================================
export const orderRepository = {
  async create(db: D1Database, row: Omit<OrderRow, 'id'>): Promise<number> {
    const res = await db
      .prepare(
        `INSERT INTO orders (${ORDER_INSERT_COLUMNS})
         VALUES (${ORDER_INSERT_PLACEHOLDERS})`
      )
      .bind(
        row.order_id,
        row.project_id,
        row.project_slug,
        row.project_title,
        row.customer_name,
        row.customer_email,
        row.customer_phone || null,
        row.amount,
        row.currency || 'INR',
        row.status || 'created',
        row.payment_provider || 'razorpay',
        row.provider_order_id || null,
        row.provider_payment_id || null,
        row.provider_signature || null,
        row.notes || null,
        row.paid_at || null,
        row.created_at,
        row.updated_at
      )
      .run();

    return res.meta.last_row_id;
  },

  async findByOrderId(db: D1Database, orderId: string): Promise<OrderRow | null> {
    return db
      .prepare(`SELECT * FROM orders WHERE order_id = ? LIMIT 1`)
      .bind(orderId)
      .first<OrderRow>();
  },

  async findByProviderOrderId(db: D1Database, providerOrderId: string): Promise<OrderRow | null> {
    return db
      .prepare(`SELECT * FROM orders WHERE provider_order_id = ? LIMIT 1`)
      .bind(providerOrderId)
      .first<OrderRow>();
  },

  async updateProviderOrderId(
    db: D1Database,
    orderId: string,
    providerOrderId: string,
    status = 'payment_pending'
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE orders
         SET provider_order_id = ?, status = ?, updated_at = ?
         WHERE order_id = ?`
      )
      .bind(providerOrderId, status, now, orderId)
      .run();
    return res.meta.changes > 0;
  },

  async markPaid(
    db: D1Database,
    orderId: string,
    providerPaymentId: string,
    providerSignature: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE orders
         SET status = 'paid',
             provider_payment_id = ?,
             provider_signature = ?,
             paid_at = ?,
             updated_at = ?
         WHERE order_id = ?`
      )
      .bind(providerPaymentId, providerSignature, now, now, orderId)
      .run();
    return res.meta.changes > 0;
  },

  async updateStatus(
    db: D1Database,
    orderId: string,
    status: string,
    notes?: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE orders
         SET status = ?,
             notes = COALESCE(?, notes),
             updated_at = ?
         WHERE order_id = ?`
      )
      .bind(status, notes || null, now, orderId)
      .run();
    return res.meta.changes > 0;
  },

  async findPublicOrder(
    db: D1Database,
    orderId: string
  ): Promise<Pick<
    OrderRow,
    | 'order_id'
    | 'project_id'
    | 'project_slug'
    | 'project_title'
    | 'amount'
    | 'currency'
    | 'status'
    | 'payment_provider'
    | 'provider_payment_id'
    | 'paid_at'
    | 'created_at'
  > | null> {
    return db
      .prepare(
        `SELECT order_id, project_id, project_slug, project_title,
                amount, currency, status, payment_provider,
                provider_payment_id, paid_at, created_at
         FROM orders
         WHERE order_id = ?
         LIMIT 1`
      )
      .bind(orderId)
      .first<
        Pick<
          OrderRow,
          | 'order_id'
          | 'project_id'
          | 'project_slug'
          | 'project_title'
          | 'amount'
          | 'currency'
          | 'status'
          | 'payment_provider'
          | 'provider_payment_id'
          | 'paid_at'
          | 'created_at'
        >
      >();
  },

  async findAllAdmin(db: D1Database, limit = 50, offset = 0): Promise<OrderRow[]> {
    const res = await db
      .prepare(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all<OrderRow>();
    return res.results || [];
  },

  async countAdmin(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM orders`).first<{ c: number }>();
    return res?.c || 0;
  },
};