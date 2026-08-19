-- Phase 11: secure guest purchase access.
-- Raw access tokens are returned once at order creation and are never stored.
ALTER TABLE orders ADD COLUMN access_token_hash TEXT;
ALTER TABLE orders ADD COLUMN access_token_created_at TEXT;

