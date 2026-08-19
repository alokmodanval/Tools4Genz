-- ============================================================
-- Tools4Genz — Migration 0006: Create Payment Webhook Events Table
--
-- Adds the `payment_webhook_events` audit and deduplication ledger
-- for asynchronous Razorpay webhook reconciliation.
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  order_id TEXT,
  amount INTEGER,
  currency TEXT,
  payload_hash TEXT,
  processed_status TEXT NOT NULL DEFAULT 'received', -- received | processing | processed | ignored | failed
  processing_error TEXT,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  created_at TEXT NOT NULL
);

-- Indices for fast deduplication, status queries, and reconciliation
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_event_id ON payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON payment_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_order_id ON payment_webhook_events(provider_order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON payment_webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON payment_webhook_events(processed_status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON payment_webhook_events(created_at);
