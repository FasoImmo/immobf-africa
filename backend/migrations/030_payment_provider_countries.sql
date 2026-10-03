-- Migration 030 : configuration des pays par fournisseur de paiement
-- Permet à l'admin de restreindre chaque fournisseur à des pays précis
-- sans modifier le code. NULL = utiliser la liste par défaut du provider.
ALTER TABLE payment_providers
  ADD COLUMN IF NOT EXISTS countries_override JSONB DEFAULT NULL;

COMMENT ON COLUMN payment_providers.countries_override IS
  'Liste ISO 3166-1 alpha-2 des pays autorisés pour ce provider (ex: ["BF","CI"]).
   NULL = utiliser la liste hardcodée du provider (comportement par défaut).';
