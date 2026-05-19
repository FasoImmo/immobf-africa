-- ImmoBF Africa — migration 004
-- Frais de publication : 1 000 FCFA par annonce (particuliers)

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_fee_paid_at TIMESTAMPTZ;

-- Index pour retrouver vite les annonces dont le frais est payé
CREATE INDEX IF NOT EXISTS idx_props_listing_fee ON properties (listing_fee_paid_at)
  WHERE listing_fee_paid_at IS NOT NULL;
