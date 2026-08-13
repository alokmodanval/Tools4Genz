import { REQUEST_INSERT_COLUMNS, REQUEST_INSERT_PLACEHOLDERS, RequestRow } from './schema';

/**
 * Typed D1 binding. D1 classes are provided by Cloudflare's runtime via
 * `@cloudflare/workers-types` (declared in worker/tsconfig.json).
 */
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

/**
 * Thin repository layer over the D1 binding — isolates all SQL in one place.
 * All queries use parameterized binding; never string interpolation of user input.
 */
export const requestRepository = {
  /**
   * Insert a new request and return its internal row id.
   */
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

  /**
   * Fetch ONLY the safe public status fields for a given request,
   * keyed by the publicly-shareable request_id (not the internal id).
   * Never selects private columns (email, phone, budget, etc.).
   */
  async findPublicStatus(db: D1Database, requestId: string): Promise<Pick<RequestRow, 'request_id' | 'status' | 'created_at'> | null> {
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
};