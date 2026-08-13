/**
 * D1 database schema definition for the requests table.
 *
 * The authoritative schema is in migrations/0001_create_requests.sql.
 * This file provides the TypeScript row type used by the Worker.
 */

export interface RequestRow {
  /** Internal numeric primary key (auto-increment) */
  id: number;
  /** Public unique request reference, e.g. TG-REQ-XXXXXXXX */
  request_id: string;
  request_type: string;
  /** Lifecycle status; Phase 5 only uses 'submitted' */
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

/**
 * Column list for parameterized INSERT — kept in sync with the migration.
 * Using named parameters (:param) prevents SQL injection — no user input
 * is ever concatenated into a query string.
 */
export const REQUEST_INSERT_COLUMNS = `
  request_id, request_type, status,
  name, email, phone, preferred_contact,
  project_type, technology, project_title, description,
  budget, deadline, additional_notes,
  course, branch, academic_year, college_name,
  company, website_url, reference_website, existing_system,
  created_at, updated_at
`;

/**
 * Named-parameter placeholders for the INSERT above.
 */
export const REQUEST_INSERT_PLACEHOLDERS = `
  :request_id, :request_type, :status,
  :name, :email, :phone, :preferred_contact,
  :project_type, :technology, :project_title, :description,
  :budget, :deadline, :additional_notes,
  :course, :branch, :academic_year, :college_name,
  :company, :website_url, :reference_website, :existing_system,
  :created_at, :updated_at
`;