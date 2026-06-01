-- Migration 009 : table newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
