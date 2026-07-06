-- Migration 019 : alertes email — recherches sauvegardées
-- Un visiteur (connecté ou non) sauvegarde ses critères de recherche
-- pour recevoir un email quotidien quand de nouvelles annonces correspondent.

CREATE TABLE IF NOT EXISTS saved_searches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  filters      JSONB NOT NULL DEFAULT '{}',
  last_sent_at TIMESTAMPTZ,           -- NULL = jamais envoyé
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un email ne peut pas avoir deux fois les mêmes filtres exacts
CREATE UNIQUE INDEX IF NOT EXISTS saved_searches_email_filters_uq
  ON saved_searches (email, (filters::text));

CREATE INDEX IF NOT EXISTS saved_searches_email_idx ON saved_searches (email);
CREATE INDEX IF NOT EXISTS saved_searches_last_sent_idx ON saved_searches (last_sent_at NULLS FIRST);
