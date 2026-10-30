CREATE TABLE IF NOT EXISTS store_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO store_settings (key, value) VALUES
  ('store_name', 'Noma Casa'),
  ('margin_percent', '30'),
  ('shipping_cents', '2490'),
  ('free_shipping_threshold_cents', '29900'),
  ('promo_text', 'Free shipping on orders over R$ 299');
