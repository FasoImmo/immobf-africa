-- Migration 031 : configuration des opérateurs par fournisseur de paiement
-- Permet à l'admin de choisir quels opérateurs mobile money sont actifs
-- par pays pour chaque fournisseur, sans modifier le code.
-- Format : { "BF": ["moov", "orange"], "CI": ["mtn", "moov"] }
-- NULL = utiliser tous les opérateurs par défaut du provider.
ALTER TABLE payment_providers
  ADD COLUMN IF NOT EXISTS operators_override JSONB DEFAULT NULL;

COMMENT ON COLUMN payment_providers.operators_override IS
  'Opérateurs actifs par pays. Ex: {"BF":["moov"],"CI":["mtn","orange"]}.
   NULL = utiliser tous les opérateurs par défaut du provider.
   Seuls les providers avec sélection d''opérateur (PawaPay, BarkaPay…)
   utilisent ce champ — ignoré pour les providers mono-opérateur.';
