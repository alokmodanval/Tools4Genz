-- Phase 16: Admin sessions now store only SHA-256 token hashes.
-- Existing raw-token sessions are revoked and their token material is overwritten.

ALTER TABLE admin_sessions ADD COLUMN session_token_hash TEXT;
UPDATE admin_sessions SET session_token = 'revoked-' || id WHERE session_token_hash IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_sessions_token_hash
  ON admin_sessions(session_token_hash) WHERE session_token_hash IS NOT NULL;
