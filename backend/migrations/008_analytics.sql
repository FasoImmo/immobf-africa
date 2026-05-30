-- Migration 008 : analytics comportemental — vues et événements
CREATE TABLE IF NOT EXISTS property_views (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id   TEXT,
  event_type   TEXT NOT NULL DEFAULT 'view'
               CHECK (event_type IN ('view','whatsapp_click','contact_click','photo_view')),
  country_code CHAR(2),
  referrer     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pviews_property  ON property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_pviews_session   ON property_views(session_id);
CREATE INDEX IF NOT EXISTS idx_pviews_user      ON property_views(user_id);
CREATE INDEX IF NOT EXISTS idx_pviews_created   ON property_views(created_at);

-- Table des recherches pour personnalisation
CREATE TABLE IF NOT EXISTS search_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id   TEXT,
  query        TEXT,
  city         TEXT,
  type         TEXT,
  transaction_type TEXT,
  min_price    NUMERIC,
  max_price    NUMERIC,
  results_count INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sevents_session ON search_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sevents_user    ON search_events(user_id);
