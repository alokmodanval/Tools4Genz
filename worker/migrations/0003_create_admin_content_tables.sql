-- ============================================================
-- Tools4Genz — D1 Migration 0003
-- Create admin content tables: tools, projects, services, categories
-- Run with: wrangler d1 migrations apply tools4genz-db
-- ============================================================

-- ============================================================
-- admin_tools
-- Stores the full Tool definition (minus the React component)
-- as JSON in the `data` column. Indexed columns allow filtering.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_tools (
  id              TEXT    PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'active',
  featured        INTEGER NOT NULL DEFAULT 0,
  data            TEXT    NOT NULL,   -- full JSON of the tool (no component)
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_tools_category  ON admin_tools (category);
CREATE INDEX IF NOT EXISTS idx_admin_tools_status    ON admin_tools (status);
CREATE INDEX IF NOT EXISTS idx_admin_tools_featured  ON admin_tools (featured);

-- ============================================================
-- admin_projects
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_projects (
  id              TEXT    PRIMARY KEY,
  slug            TEXT    NOT NULL UNIQUE,
  title           TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  status          TEXT    NOT NULL DEFAULT 'available',
  featured        INTEGER NOT NULL DEFAULT 0,
  data            TEXT    NOT NULL,   -- full JSON of the project
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_projects_category  ON admin_projects (category);
CREATE INDEX IF NOT EXISTS idx_admin_projects_status    ON admin_projects (status);
CREATE INDEX IF NOT EXISTS idx_admin_projects_featured  ON admin_projects (featured);

-- ============================================================
-- admin_services
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_services (
  id              TEXT    PRIMARY KEY,
  title           TEXT    NOT NULL,
  category        TEXT    NOT NULL,
  data            TEXT    NOT NULL,   -- full JSON of the service
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_services_category ON admin_services (category);

-- ============================================================
-- admin_categories
-- Scope: 'tool' | 'project' | 'service'
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_categories (
  id              TEXT    NOT NULL,   -- e.g. "ai-tools", "Development"
  type            TEXT    NOT NULL,   -- 'tool' | 'project' | 'service'
  name            TEXT    NOT NULL,
  icon            TEXT,
  "count"         INTEGER NOT NULL DEFAULT 0,
  data            TEXT,               -- full JSON (optional extra metadata)
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  PRIMARY KEY (id, type)
);

CREATE INDEX IF NOT EXISTS idx_admin_categories_type   ON admin_categories (type);
