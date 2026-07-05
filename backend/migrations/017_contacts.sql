-- Migration 017 : table contacts (visiteurs enregistrés + invités)
-- Consolide les infos de contact pour le CRM admin :
--   - visiteurs connectés (user_id non-null)
--   - invités ayant payé sans créer de compte (user_id null, email capturé au paiement)

CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  name        TEXT,
  country     TEXT,
  language    TEXT DEFAULT 'fr',
  visit_count INTEGER NOT NULL DEFAULT 1,
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unicité sur email (insensible à la casse) — un visiteur peut revenir
-- connecté ou invité avec le même email
CREATE UNIQUE INDEX IF NOT EXISTS contacts_email_uq ON contacts (LOWER(email));

-- Index recherche admin
CREATE INDEX IF NOT EXISTS contacts_country_idx  ON contacts (country);
CREATE INDEX IF NOT EXISTS contacts_language_idx ON contacts (language);
CREATE INDEX IF NOT EXISTS contacts_last_seen_idx ON contacts (last_seen DESC);
