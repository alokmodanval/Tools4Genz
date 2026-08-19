-- ============================================================
-- Migration: 0009_create_project_releases.sql
-- Description: Shared private R2 project releases for digital delivery
-- ============================================================

CREATE TABLE IF NOT EXISTS project_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  version TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/zip',
  file_size INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT,
  UNIQUE(project_id, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_releases_r2_key
  ON project_releases(r2_key);

CREATE INDEX IF NOT EXISTS idx_project_releases_project_id
  ON project_releases(project_id);

CREATE INDEX IF NOT EXISTS idx_project_releases_status
  ON project_releases(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_releases_one_published
  ON project_releases(project_id)
  WHERE status = 'published';

ALTER TABLE digital_deliveries ADD COLUMN release_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_digital_deliveries_release_id
  ON digital_deliveries(release_id);
