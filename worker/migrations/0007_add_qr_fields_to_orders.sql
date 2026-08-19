-- ============================================================
-- Migration: 0007_add_qr_fields_to_orders.sql
-- Description: Add Dynamic UPI QR payment fields to orders table
-- ============================================================

ALTER TABLE orders ADD COLUMN qr_id TEXT;
ALTER TABLE orders ADD COLUMN qr_image_url TEXT;
ALTER TABLE orders ADD COLUMN qr_status TEXT;
ALTER TABLE orders ADD COLUMN qr_close_by INTEGER;
ALTER TABLE orders ADD COLUMN qr_created_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_qr_id ON orders(qr_id);
