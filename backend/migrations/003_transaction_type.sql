-- ImmoBF Africa — migration 003
-- Ajout transaction_type (vente / location) et champs associés

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'sale'
    CHECK (transaction_type IN ('sale','rent_long','rent_short')),
  ADD COLUMN IF NOT EXISTS is_furnished     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rent_period      TEXT
    CHECK (rent_period IN ('monthly','weekly','nightly') OR rent_period IS NULL);

CREATE INDEX IF NOT EXISTS idx_props_tx_type ON properties (transaction_type);
