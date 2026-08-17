-- ============================================================
-- Tools4Genz — D1 Migration 0002
-- Create admin_users and admin_sessions tables for Phase 7 authentication.
-- Run with: wrangler d1 migrations apply tools4genz-db
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  email           TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,
  role            TEXT    NOT NULL DEFAULT 'admin',
  status          TEXT    NOT NULL DEFAULT 'active',
  last_login_at   TEXT,
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id   INTEGER NOT NULL,
  session_token   TEXT    NOT NULL,
  expires_at      TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  last_seen_at    TEXT    NOT NULL,

  FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- Indexes for common lookup & security queries
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);
CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users (status);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions (admin_user_id);

-- request_id already has a UNIQUE constraint which creates an implicit index.
  