-- Phase 10 MVP storage provider selection. Existing releases remain R2-backed;
-- new uploads use KV until R2 can be enabled.
ALTER TABLE project_releases
  ADD COLUMN storage_provider TEXT NOT NULL DEFAULT 'r2';

CREATE INDEX IF NOT EXISTS idx_project_releases_storage_provider
  ON project_releases(storage_provider);
