import {
  AdminCategoryRow,
  AdminProjectRow,
  AdminServiceRow,
  AdminSessionRow,
  AdminToolRow,
  AdminUserRow,
  AffiliateOfferRow,
  DIGITAL_DELIVERY_INSERT_COLUMNS,
  DIGITAL_DELIVERY_INSERT_PLACEHOLDERS,
  DigitalDeliveryRow,
  ORDER_INSERT_COLUMNS,
  ORDER_INSERT_PLACEHOLDERS,
  OrderRow,
  PAYMENT_WEBHOOK_EVENT_INSERT_COLUMNS,
  PAYMENT_WEBHOOK_EVENT_INSERT_PLACEHOLDERS,
  PaymentWebhookEventRow,
  PROJECT_RELEASE_INSERT_COLUMNS,
  PROJECT_RELEASE_INSERT_PLACEHOLDERS,
  ProjectReleaseRow,
  PurchaseRecoveryRequestRow,
  PurchaseRecoveryTokenRow,
  REQUEST_INSERT_COLUMNS,
  REQUEST_INSERT_PLACEHOLDERS,
  RequestRow,
  TransactionalEmailEventRow,
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
        `SELECT * FROM requests ORDER BY created_at DESC LIMIT 500`
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
    session: { admin_user_id: number; session_token_hash: string; expires_at: string }
  ): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO admin_sessions (admin_user_id, session_token, session_token_hash, expires_at, created_at, last_seen_at)
         VALUES (?, 'hashed', ?, ?, ?, ?)`
      )
      .bind(session.admin_user_id, session.session_token_hash, session.expires_at, now, now)
      .run();
  },

  async findValidSession(
    db: D1Database,
    tokenHash: string
  ): Promise<(AdminSessionRow & { email: string; role: string; user_status: string }) | null> {
    const now = new Date().toISOString();
    return db
      .prepare(
        `SELECT s.*, u.email, u.role, u.status as user_status
         FROM admin_sessions s
         JOIN admin_users u ON s.admin_user_id = u.id
         WHERE s.session_token_hash = ? AND s.expires_at > ? AND u.status = 'active'
         LIMIT 1`
      )
      .bind(tokenHash, now)
      .first<AdminSessionRow & { email: string; role: string; user_status: string }>();
  },

  async updateLastSeen(db: D1Database, id: number): Promise<void> {
    const now = new Date().toISOString();
    await db
      .prepare(`UPDATE admin_sessions SET last_seen_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();
  },

  async deleteByTokenHash(db: D1Database, tokenHash: string): Promise<void> {
    await db
      .prepare(`DELETE FROM admin_sessions WHERE session_token_hash = ?`)
      .bind(tokenHash)
      .run();
  },
};

// ============================================================
// Admin Tools Repository
// ============================================================
export const adminToolRepository = {
  async getAll(db: D1Database): Promise<AdminToolRow[]> {
    const res = await db
      .prepare(`SELECT * FROM admin_tools ORDER BY created_at DESC LIMIT 500`)
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
      .prepare(`SELECT * FROM admin_projects ORDER BY created_at DESC LIMIT 500`)
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
      .prepare(`SELECT * FROM admin_services ORDER BY created_at DESC LIMIT 500`)
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
      .prepare(`SELECT * FROM admin_categories ORDER BY type ASC, name ASC LIMIT 500`)
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
export interface PublicOrderColumns {
  order_id: string;
  project_id: string;
  project_slug: string;
  project_title: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string;
  provider_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
  delivery_status?: string | null;
}

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
        row.updated_at,
        row.access_token_hash || null,
        row.access_token_created_at || null
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

  async findByQrId(db: D1Database, qrId: string): Promise<OrderRow | null> {
    return db
      .prepare(`SELECT * FROM orders WHERE qr_id = ? LIMIT 1`)
      .bind(qrId)
      .first<OrderRow>();
  },

  async updateQrDetails(
    db: D1Database,
    orderId: string,
    qrData: {
      qrId: string;
      imageUrl: string;
      status?: string;
      closeBy?: number | null;
    }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE orders
         SET qr_id = ?,
             qr_image_url = ?,
             qr_status = ?,
             qr_close_by = ?,
             qr_created_at = ?,
             status = CASE WHEN status = 'created' THEN 'payment_pending' ELSE status END,
             updated_at = ?
         WHERE order_id = ?`
      )
      .bind(
        qrData.qrId,
        qrData.imageUrl,
        qrData.status || 'active',
        qrData.closeBy || null,
        now,
        now,
        orderId
      )
      .run();
    return res.meta.changes > 0;
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

  /** Phase 9: Safe public order projection that also exposes delivery_status. */
  async findPublicOrder(db: D1Database, orderId: string): Promise<PublicOrderColumns | null> {
    return db
      .prepare(
        `SELECT order_id, project_id, project_slug, project_title,
                amount, currency, status, payment_provider,
                provider_payment_id, paid_at, created_at,
                delivery_status
         FROM orders
         WHERE order_id = ?
         LIMIT 1`
      )
      .bind(orderId)
      .first<PublicOrderColumns>();
  },

  /** Phase 9: Link a delivery record to an order (only after payment confirmed). */
  async linkDelivery(
    db: D1Database,
    orderId: string,
    deliveryId: number,
    deliveryStatus: string
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE orders
         SET delivery_id = ?,
             delivery_status = ?,
             delivery_project_id = (SELECT project_id FROM digital_deliveries WHERE id = ?),
             updated_at = ?
         WHERE order_id = ?`
      )
      .bind(deliveryId, deliveryStatus, deliveryId, now, orderId)
      .run();
    return res.meta.changes > 0;
  },

  async findAllAdmin(db: D1Database, limit = 50, offset = 0): Promise<OrderRow[]> {
    const res = await db
      .prepare(
        `SELECT id, order_id, project_id, project_slug, project_title,
                customer_name, customer_email, customer_phone,
                amount, currency, status, payment_provider,
                provider_order_id, provider_payment_id, provider_signature,
                qr_id, qr_image_url, qr_status, qr_close_by, qr_created_at,
                delivery_id, delivery_status, delivery_project_id,
                notes, paid_at, created_at, updated_at
         FROM orders
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all<OrderRow>();
    return res.results || [];
  },

  async countAdmin(db: D1Database): Promise<number> {
    const res = await db.prepare(`SELECT COUNT(*) as c FROM orders`).first<{ c: number }>();
    return res?.c || 0;
  },

  async findPaidByNormalizedEmail(db: D1Database, normalizedEmail: string): Promise<OrderRow[]> {
    const res = await db
      .prepare(
        `SELECT * FROM orders
         WHERE LOWER(TRIM(customer_email)) = ? AND status = 'paid'
         ORDER BY created_at DESC`
      )
      .bind(normalizedEmail)
      .all<OrderRow>();
    return res.results || [];
  },

  async rotateAccessToken(
    db: D1Database,
    orderId: string,
    accessTokenHash: string,
    createdAt: string
  ): Promise<boolean> {
    const res = await db
      .prepare(
        `UPDATE orders
         SET access_token_hash = ?, access_token_created_at = ?, updated_at = ?
         WHERE order_id = ?`
      )
      .bind(accessTokenHash, createdAt, createdAt, orderId)
      .run();
    return res.meta.changes > 0;
  },
};

// ============================================================
// Transactional Email & Purchase Recovery Repository (Phase 12)
// ============================================================
export const transactionalEmailRepository = {
  async findByDedupeKey(db: D1Database, dedupeKey: string): Promise<TransactionalEmailEventRow | null> {
    return db.prepare(`SELECT * FROM transactional_email_events WHERE dedupe_key = ? LIMIT 1`)
      .bind(dedupeKey).first<TransactionalEmailEventRow>();
  },

  async createProcessing(
    db: D1Database,
    input: { orderId: string | null; emailType: string; dedupeKey: string; provider: string }
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db.prepare(
      `INSERT OR IGNORE INTO transactional_email_events
       (order_id, email_type, dedupe_key, provider, provider_message_id, status,
        attempt_count, last_error, created_at, sent_at, updated_at)
       VALUES (?, ?, ?, ?, NULL, 'processing', 1, NULL, ?, NULL, ?)`
    ).bind(input.orderId, input.emailType, input.dedupeKey, input.provider, now, now).run();
    return res.meta.changes > 0;
  },

  async claimFailedRetry(db: D1Database, dedupeKey: string): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db.prepare(
      `UPDATE transactional_email_events
       SET status = 'processing', attempt_count = attempt_count + 1,
           last_error = NULL, updated_at = ?
       WHERE dedupe_key = ? AND status = 'failed'`
    ).bind(now, dedupeKey).run();
    return res.meta.changes > 0;
  },

  async markSent(db: D1Database, dedupeKey: string, providerMessageId: string | null): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare(
      `UPDATE transactional_email_events
       SET status = 'sent', provider_message_id = ?, sent_at = ?, updated_at = ?
       WHERE dedupe_key = ?`
    ).bind(providerMessageId, now, now, dedupeKey).run();
  },

  async markFailed(db: D1Database, dedupeKey: string, safeError: string): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare(
      `UPDATE transactional_email_events
       SET status = 'failed', last_error = ?, updated_at = ?
       WHERE dedupe_key = ?`
    ).bind(safeError.slice(0, 500), now, dedupeKey).run();
  },
};

export const purchaseRecoveryRepository = {
  async countRecentRequests(db: D1Database, emailHash: string, since: string): Promise<number> {
    const row = await db.prepare(
      `SELECT COUNT(*) AS c FROM purchase_recovery_requests
       WHERE email_hash = ? AND created_at >= ?`
    ).bind(emailHash, since).first<{ c: number }>();
    return row?.c || 0;
  },

  async findLatestRequest(db: D1Database, emailHash: string): Promise<PurchaseRecoveryRequestRow | null> {
    return db.prepare(
      `SELECT * FROM purchase_recovery_requests
       WHERE email_hash = ? ORDER BY created_at DESC LIMIT 1`
    ).bind(emailHash).first<PurchaseRecoveryRequestRow>();
  },

  async createRequest(
    db: D1Database,
    row: Omit<PurchaseRecoveryRequestRow, 'id'>
  ): Promise<void> {
    await db.prepare(
      `INSERT INTO purchase_recovery_requests
       (request_id, email_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(row.request_id, row.email_hash, row.status, row.created_at, row.updated_at).run();
  },

  async updateRequestStatus(db: D1Database, requestId: string, status: string): Promise<void> {
    await db.prepare(
      `UPDATE purchase_recovery_requests SET status = ?, updated_at = ? WHERE request_id = ?`
    ).bind(status, new Date().toISOString(), requestId).run();
  },

  async createToken(db: D1Database, row: Omit<PurchaseRecoveryTokenRow, 'id'>): Promise<void> {
    await db.prepare(
      `INSERT INTO purchase_recovery_tokens
       (request_id, order_id, token_hash, expires_at, used_at, revoked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      row.request_id, row.order_id, row.token_hash, row.expires_at,
      row.used_at, row.revoked_at, row.created_at
    ).run();
  },

  async findTokenByHash(db: D1Database, tokenHash: string): Promise<PurchaseRecoveryTokenRow | null> {
    return db.prepare(`SELECT * FROM purchase_recovery_tokens WHERE token_hash = ? LIMIT 1`)
      .bind(tokenHash).first<PurchaseRecoveryTokenRow>();
  },

  async claimToken(db: D1Database, tokenId: number, now: string): Promise<boolean> {
    const res = await db.prepare(
      `UPDATE purchase_recovery_tokens
       SET used_at = ?
       WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?`
    ).bind(now, tokenId, now).run();
    return res.meta.changes > 0;
  },

  async revokeRequestTokens(db: D1Database, requestId: string): Promise<void> {
    const now = new Date().toISOString();
    await db.prepare(
      `UPDATE purchase_recovery_tokens
       SET revoked_at = ?
       WHERE request_id = ? AND used_at IS NULL AND revoked_at IS NULL`
    ).bind(now, requestId).run();
  },
};

// ============================================================
// Payment Webhook Events Repository (Phase 8B)
// ============================================================
export const paymentWebhookRepository = {
  async create(
    db: D1Database,
    event: Omit<PaymentWebhookEventRow, 'id'>
  ): Promise<number> {
    const res = await db
      .prepare(
        `INSERT INTO payment_webhook_events (${PAYMENT_WEBHOOK_EVENT_INSERT_COLUMNS})
         VALUES (${PAYMENT_WEBHOOK_EVENT_INSERT_PLACEHOLDERS})`
      )
      .bind(
        event.provider,
        event.event_id,
        event.event_type,
        event.provider_order_id,
        event.provider_payment_id,
        event.order_id,
        event.amount,
        event.currency,
        event.payload_hash,
        event.processed_status,
        event.processing_error,
        event.received_at,
        event.processed_at,
        event.created_at
      )
      .run();
    return res.meta.last_row_id;
  },

  async findByEventId(
    db: D1Database,
    eventId: string
  ): Promise<PaymentWebhookEventRow | null> {
    return db
      .prepare(`SELECT * FROM payment_webhook_events WHERE event_id = ? LIMIT 1`)
      .bind(eventId)
      .first<PaymentWebhookEventRow>();
  },

  async updateStatus(
    db: D1Database,
    eventId: string,
    processedStatus: string,
    options?: {
      processingError?: string | null;
      processedAt?: string | null;
      orderId?: string | null;
      providerOrderId?: string | null;
      providerPaymentId?: string | null;
    }
  ): Promise<boolean> {
    const processedAt = options?.processedAt ?? new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE payment_webhook_events
         SET processed_status = ?,
             processing_error = COALESCE(?, processing_error),
             processed_at = ?,
             order_id = COALESCE(?, order_id),
             provider_order_id = COALESCE(?, provider_order_id),
             provider_payment_id = COALESCE(?, provider_payment_id)
         WHERE event_id = ?`
      )
      .bind(
        processedStatus,
        options?.processingError ?? null,
        processedAt,
        options?.orderId ?? null,
        options?.providerOrderId ?? null,
        options?.providerPaymentId ?? null,
        eventId
      )
      .run();
    return res.meta.changes > 0;
  },

  async findAllAdmin(
    db: D1Database,
    limit = 50,
    offset = 0
  ): Promise<PaymentWebhookEventRow[]> {
    const res = await db
      .prepare(
        `SELECT * FROM payment_webhook_events ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(limit, offset)
      .all<PaymentWebhookEventRow>();
    return res.results || [];
  },

  async countAdmin(db: D1Database): Promise<number> {
    const res = await db
      .prepare(`SELECT COUNT(*) as c FROM payment_webhook_events`)
      .first<{ c: number }>();
    return res?.c || 0;
  },
};

// ============================================================
// Project Releases Repository (Phase 10)
// ============================================================
export const projectReleaseRepository = {
  async findById(db: D1Database, id: number): Promise<ProjectReleaseRow | null> {
    return db
      .prepare(`SELECT * FROM project_releases WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<ProjectReleaseRow>();
  },

  async findByProjectVersion(
    db: D1Database,
    projectId: string,
    version: string
  ): Promise<ProjectReleaseRow | null> {
    return db
      .prepare(
        `SELECT * FROM project_releases
         WHERE project_id = ? AND version = ?
         LIMIT 1`
      )
      .bind(projectId, version)
      .first<ProjectReleaseRow>();
  },

  async findPublishedByProjectId(
    db: D1Database,
    projectId: string
  ): Promise<ProjectReleaseRow | null> {
    return db
      .prepare(
        `SELECT * FROM project_releases
         WHERE project_id = ? AND status = 'published'
         ORDER BY published_at DESC, id DESC
         LIMIT 1`
      )
      .bind(projectId)
      .first<ProjectReleaseRow>();
  },

  async listByProjectId(db: D1Database, projectId: string): Promise<ProjectReleaseRow[]> {
    const res = await db
      .prepare(
        `SELECT * FROM project_releases
         WHERE project_id = ?
         ORDER BY created_at DESC, id DESC LIMIT 100`
      )
      .bind(projectId)
      .all<ProjectReleaseRow>();
    return res.results || [];
  },

  async saveAsset(
    db: D1Database,
    row: Omit<ProjectReleaseRow, 'id'>
  ): Promise<ProjectReleaseRow | null> {
    await db
      .prepare(
        `INSERT INTO project_releases (${PROJECT_RELEASE_INSERT_COLUMNS})
         VALUES (${PROJECT_RELEASE_INSERT_PLACEHOLDERS})
         ON CONFLICT(project_id, version) DO UPDATE SET
           r2_key = excluded.r2_key,
           filename = excluded.filename,
           content_type = excluded.content_type,
           file_size = excluded.file_size,
           sha256 = excluded.sha256,
           storage_provider = excluded.storage_provider,
           status = 'ready',
           updated_at = excluded.updated_at,
           published_at = NULL`
      )
      .bind(
        row.project_id,
        row.version,
        row.r2_key,
        row.filename,
        row.content_type,
        row.file_size,
        row.sha256,
        row.status,
        row.created_at,
        row.updated_at,
        row.published_at,
        row.storage_provider
      )
      .run();
    return this.findByProjectVersion(db, row.project_id, row.version);
  },

  async publish(db: D1Database, release: ProjectReleaseRow): Promise<ProjectReleaseRow | null> {
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          `UPDATE project_releases
           SET status = 'archived', updated_at = ?
           WHERE project_id = ? AND status = 'published' AND id <> ?`
        )
        .bind(now, release.project_id, release.id),
      db
        .prepare(
          `UPDATE project_releases
           SET status = 'published', published_at = ?, updated_at = ?
           WHERE id = ? AND status IN ('ready', 'published')`
        )
        .bind(now, now, release.id),
    ]);
    return this.findById(db, release.id);
  },

  async archive(db: D1Database, id: number): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE project_releases
         SET status = 'archived', updated_at = ?
         WHERE id = ?`
      )
      .bind(now, id)
      .run();
    return res.meta.changes > 0;
  },
};

// ============================================================
// Digital Deliveries Repository (Phases 9–10)
// ============================================================
export const digitalDeliveryRepository = {
  /**
   * Find a delivery record by internal TG-ORD- order id.
   */
  async findByOrderId(db: D1Database, orderId: string): Promise<DigitalDeliveryRow | null> {
    return db
      .prepare(
        `SELECT * FROM digital_deliveries WHERE order_id = ? LIMIT 1`
      )
      .bind(orderId)
      .first<DigitalDeliveryRow>();
  },

  /**
   * Find a delivery record by its numeric primary key.
   */
  async findById(db: D1Database, id: number): Promise<DigitalDeliveryRow | null> {
    return db
      .prepare(
        `SELECT * FROM digital_deliveries WHERE id = ? LIMIT 1`
      )
      .bind(id)
      .first<DigitalDeliveryRow>();
  },

  /**
   * Create a new delivery record.
   * Returns the new row's primary key (id).
   */
  async create(
    db: D1Database,
    row: Omit<DigitalDeliveryRow, 'id'>
  ): Promise<number> {
    const res = await db
      .prepare(
        `INSERT INTO digital_deliveries (${DIGITAL_DELIVERY_INSERT_COLUMNS})
         VALUES (${DIGITAL_DELIVERY_INSERT_PLACEHOLDERS})`
      )
      .bind(
        row.order_id,
        row.project_id,
        row.delivery_status,
        row.delivery_key,
        row.download_count,
        row.last_download_at,
        row.created_at,
        row.updated_at,
        row.file_size || null,
        row.sha256 || null,
        row.release_id || null
      )
      .run();
    return res.meta.last_row_id;
  },

  /**
   * Update fields of an existing delivery record.
   */
  async update(
    db: D1Database,
    deliveryId: number,
    fields: Partial<
      Pick<
        DigitalDeliveryRow,
        | 'delivery_status'
        | 'file_size'
        | 'sha256'
        | 'release_id'
        | 'delivery_key'
      >
    >
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const sets: string[] = [];
    const values: unknown[] = [];

    if (fields.delivery_status !== undefined) {
      sets.push('delivery_status = ?');
      values.push(fields.delivery_status);
    }
    if (fields.file_size !== undefined) {
      sets.push('file_size = ?');
      values.push(fields.file_size);
    }
    if (fields.sha256 !== undefined) {
      sets.push('sha256 = ?');
      values.push(fields.sha256);
    }
    if (fields.release_id !== undefined) {
      sets.push('release_id = ?');
      values.push(fields.release_id);
    }
    if (fields.delivery_key !== undefined) {
      sets.push('delivery_key = ?');
      values.push(fields.delivery_key);
    }

    if (sets.length === 0) {
      return false;
    }

    values.push(now, deliveryId);
    const res = await db
      .prepare(
        `UPDATE digital_deliveries
         SET ${sets.join(', ')}, updated_at = ?
         WHERE id = ?`
      )
      .bind(...values)
      .run();
    return res.meta.changes > 0;
  },

  /**
   * Increment download counter and set last_download_at atomically.
   * Safe server-side counting — never trusts the frontend.
   */
  async incrementDownloadCount(db: D1Database, deliveryId: number): Promise<boolean> {
    const now = new Date().toISOString();
    const res = await db
      .prepare(
        `UPDATE digital_deliveries
         SET download_count = download_count + 1,
             last_download_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .bind(now, now, deliveryId)
      .run();
    return res.meta.changes > 0;
  },
};

// ============================================================
// Affiliate Offers Repository (Phase 15)
// ============================================================
export const affiliateOfferRepository = {
  async listAdmin(db: D1Database): Promise<AffiliateOfferRow[]> {
    const result = await db.prepare(`SELECT * FROM affiliate_offers ORDER BY sort_order, id DESC LIMIT 500`).all<AffiliateOfferRow>();
    return result.results || [];
  },

  async listPublished(db: D1Database, entityType?: string, entityId?: string): Promise<AffiliateOfferRow[]> {
    const clauses = [`status = 'published'`];
    const values: unknown[] = [];
    if (entityType) { clauses.push(`(entity_type IS NULL OR entity_type = ?)`); values.push(entityType); }
    if (entityId) { clauses.push(`(entity_id IS NULL OR entity_id = ?)`); values.push(entityId); }
    const result = await db.prepare(
      `SELECT * FROM affiliate_offers WHERE ${clauses.join(' AND ')} ORDER BY featured DESC, sort_order, id DESC LIMIT 12`
    ).bind(...values).all<AffiliateOfferRow>();
    return result.results || [];
  },

  findById(db: D1Database, id: number) {
    return db.prepare(`SELECT * FROM affiliate_offers WHERE id = ? LIMIT 1`).bind(id).first<AffiliateOfferRow>();
  },

  async create(db: D1Database, row: Omit<AffiliateOfferRow, 'id'>): Promise<AffiliateOfferRow | null> {
    const result = await db.prepare(
      `INSERT INTO affiliate_offers
       (title, slug, description, destination_url, category, image_url, cta_text, disclosure_text,
        status, featured, sort_order, entity_type, entity_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(row.title, row.slug, row.description, row.destination_url, row.category, row.image_url,
      row.cta_text, row.disclosure_text, row.status, row.featured, row.sort_order,
      row.entity_type, row.entity_id, row.created_at, row.updated_at).run();
    return this.findById(db, result.meta.last_row_id);
  },

  async update(db: D1Database, id: number, row: Omit<AffiliateOfferRow, 'id' | 'created_at'>): Promise<AffiliateOfferRow | null> {
    await db.prepare(
      `UPDATE affiliate_offers SET title = ?, slug = ?, description = ?, destination_url = ?, category = ?,
       image_url = ?, cta_text = ?, disclosure_text = ?, status = ?, featured = ?, sort_order = ?,
       entity_type = ?, entity_id = ?, updated_at = ? WHERE id = ?`
    ).bind(row.title, row.slug, row.description, row.destination_url, row.category, row.image_url,
      row.cta_text, row.disclosure_text, row.status, row.featured, row.sort_order,
      row.entity_type, row.entity_id, row.updated_at, id).run();
    return this.findById(db, id);
  },

  async archive(db: D1Database, id: number): Promise<boolean> {
    const result = await db.prepare(`UPDATE affiliate_offers SET status = 'archived', updated_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), id).run();
    return result.meta.changes > 0;
  },
};
