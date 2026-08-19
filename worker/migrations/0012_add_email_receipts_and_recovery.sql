-- Phase 12: transactional email idempotency and one-time purchase recovery.

CREATE TABLE IF NOT EXISTS transactional_email_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  email_type TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactional_email_events_dedupe
  ON transactional_email_events(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_transactional_email_events_order_type
  ON transactional_email_events(order_id, email_type);
CREATE INDEX IF NOT EXISTS idx_transactional_email_events_status
  ON transactional_email_events(status);

CREATE TABLE IF NOT EXISTS purchase_recovery_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_recovery_requests_request_id
  ON purchase_recovery_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recovery_requests_email_created
  ON purchase_recovery_requests(email_hash, created_at);

CREATE TABLE IF NOT EXISTS purchase_recovery_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_recovery_tokens_hash
  ON purchase_recovery_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_purchase_recovery_tokens_request
  ON purchase_recovery_tokens(request_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recovery_tokens_order
  ON purchase_recovery_tokens(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recovery_tokens_expiry
  ON purchase_recovery_tokens(expires_at);

