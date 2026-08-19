-- ============================================================
-- Migration: 0008_add_digital_delivery.sql
-- Description: Add digital delivery system for purchased projects
-- ============================================================

-- Create digital_deliveries table for tracking project file delivery
CREATE TABLE IF NOT EXISTS digital_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending',
  delivery_key TEXT NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  last_download_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  file_size INTEGER,
  sha256 TEXT
);

-- Indices for fast order/project lookups and delivery status queries
CREATE UNIQUE INDEX IF NOT EXISTS idx_digital_deliveries_order_id ON digital_deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_project_id ON digital_deliveries(project_id);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_status ON digital_deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_digital_deliveries_delivery_key ON digital_deliveries(delivery_key);

-- Add delivery linkage to orders table
ALTER TABLE orders ADD COLUMN delivery_id INTEGER;
ALTER TABLE orders ADD COLUMN delivery_status TEXT DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_delivery_id ON orders(delivery_id);

-- Add project_id and delivery tracking to orders
ALTER TABLE orders ADD COLUMN delivery_project_id TEXT;
