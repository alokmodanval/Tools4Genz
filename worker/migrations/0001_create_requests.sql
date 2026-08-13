-- ============================================================
-- Tools4Genz — D1 Migration 0001
-- Create the requests table for the Phase 5 request system.
-- Run with: wrangler d1 migrations apply tools4genz-db
-- ============================================================

CREATE TABLE IF NOT EXISTS requests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id        TEXT    NOT NULL UNIQUE,
  request_type      TEXT    NOT NULL,
  status            TEXT    NOT NULL DEFAULT 'submitted',

  -- Contact
  name              TEXT    NOT NULL,
  email             TEXT    NOT NULL,
  phone             TEXT,
  preferred_contact TEXT,

  -- Project detail
  project_type      TEXT    NOT NULL,
  technology        TEXT,
  project_title     TEXT,
  description       TEXT    NOT NULL,

  -- Budget & timeline
  budget            TEXT,
  deadline          TEXT,
  additional_notes  TEXT,

  -- Student-specific
  course            TEXT,
  branch            TEXT,
  academic_year     TEXT,
  college_name      TEXT,

  -- Client-specific
  company           TEXT,
  website_url       TEXT,
  reference_website TEXT,
  existing_system   TEXT,

  created_at        TEXT    NOT NULL,
  updated_at        TEXT    NOT NULL
);

-- Indexes for common lookup & lifecycle queries
CREATE INDEX IF NOT EXISTS idx_requests_request_type ON requests (request_type);
CREATE INDEX IF NOT EXISTS idx_requests_status        ON requests (status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at    ON requests (created_at);
CREATE INDEX IF NOT EXISTS idx_requests_email         ON requests (email);

-- request_id already has a UNIQUE constraint which creates an implicit index.