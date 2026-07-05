-- Migration 016 : paramètres plateforme (promo, config admin)
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Valeurs par défaut (promo inactive)
INSERT INTO platform_settings (key, value) VALUES
  ('promo_active',     'false'),
  ('promo_start',      NULL),
  ('promo_end',        NULL),
  ('promo_message_fr', NULL),
  ('promo_message_en', NULL)
ON CONFLICT (key) DO NOTHING;
