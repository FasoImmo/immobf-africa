-- ImmoBF Africa — migration 002
-- Colonnes de traduction cachée sur les annonces
-- Format JSONB : { "en": "translated text", "mos": "..." }
-- La langue source est toujours le français (langue de saisie).

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS title_translations       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description_translations JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Index GIN pour pouvoir filtrer/chercher dans les traductions si besoin
CREATE INDEX IF NOT EXISTS idx_props_title_tr ON properties USING GIN (title_translations);
