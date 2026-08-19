-- Consolidated product platform additions: public settings, customer accounts, and safe analytics.

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_normalized TEXT NOT NULL UNIQUE,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES customer_users(id)
);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON customer_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_sessions_expiry ON customer_sessions(expires_at);

CREATE TABLE IF NOT EXISTS customer_login_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_normalized TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customer_challenges_email ON customer_login_challenges(email_normalized, created_at);

ALTER TABLE orders ADD COLUMN customer_user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_orders_customer_user ON orders(customer_user_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  customer_user_id INTEGER,
  event_name TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_event_created ON analytics_events(event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session_created ON analytics_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_customer_created ON analytics_events(customer_user_id, created_at);

INSERT OR IGNORE INTO site_settings(setting_key, setting_value, updated_at) VALUES
  ('site_name', 'Tools4Genz', CURRENT_TIMESTAMP),
  ('tagline', 'Smart tools, projects and digital solutions', CURRENT_TIMESTAMP),
  ('short_description', 'Practical tools and software solutions for students, creators and businesses.', CURRENT_TIMESTAMP),
  ('support_email', '', CURRENT_TIMESTAMP),
  ('whatsapp_number', '', CURRENT_TIMESTAMP),
  ('phone_number', '', CURRENT_TIMESTAMP),
  ('location_text', '', CURRENT_TIMESTAMP),
  ('business_hours', '', CURRENT_TIMESTAMP),
  ('support_message', '', CURRENT_TIMESTAMP),
  ('purchase_support_email', '', CURRENT_TIMESTAMP),
  ('service_enquiry_message', '', CURRENT_TIMESTAMP),
  ('instagram_url', '', CURRENT_TIMESTAMP),
  ('youtube_url', '', CURRENT_TIMESTAMP),
  ('github_url', '', CURRENT_TIMESTAMP),
  ('linkedin_url', '', CURRENT_TIMESTAMP);
