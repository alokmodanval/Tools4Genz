-- Phase 15: deploy-safe monetization configuration and Admin-managed affiliate offers.

CREATE TABLE IF NOT EXISTS affiliate_offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  cta_text TEXT NOT NULL DEFAULT 'Learn more',
  disclosure_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  featured INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_affiliate_offers_status_sort
  ON affiliate_offers(status, sort_order, id);
CREATE INDEX IF NOT EXISTS idx_affiliate_offers_entity
  ON affiliate_offers(entity_type, entity_id, status);

INSERT OR IGNORE INTO site_settings(setting_key, setting_value, updated_at) VALUES
  ('ads_enabled', 'false', CURRENT_TIMESTAMP),
  ('adsense_enabled', 'false', CURRENT_TIMESTAMP),
  ('adsense_publisher_id', '', CURRENT_TIMESTAMP),
  ('auto_ads_enabled', 'false', CURRENT_TIMESTAMP),
  ('ads_on_tools', 'false', CURRENT_TIMESTAMP),
  ('ads_on_projects', 'false', CURRENT_TIMESTAMP),
  ('ads_on_services', 'false', CURRENT_TIMESTAMP),
  ('adsense_tools_listing_slot_id', '', CURRENT_TIMESTAMP),
  ('adsense_tool_content_slot_id', '', CURRENT_TIMESTAMP),
  ('adsense_project_content_slot_id', '', CURRENT_TIMESTAMP),
  ('adsense_services_content_slot_id', '', CURRENT_TIMESTAMP),
  ('consent_provider_configured', 'false', CURRENT_TIMESTAMP),
  ('consent_provider_name', '', CURRENT_TIMESTAMP),
  ('affiliate_enabled', 'false', CURRENT_TIMESTAMP),
  ('affiliate_disclosure_text', 'Some recommendations may be sponsored or use affiliate links. Tools4Genz may earn a commission without increasing your price.', CURRENT_TIMESTAMP),
  ('premium_features_enabled', 'false', CURRENT_TIMESTAMP);
