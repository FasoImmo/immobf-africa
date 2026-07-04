-- Migration 015 : blocage manuel de dates par l'annonceur
-- Permet au propriétaire d'indiquer des périodes d'indisponibilité
-- sans passer par une réservation plateforme (ex. déjà réservé hors
-- plateforme, usage personnel, travaux, etc.).
-- Ces blocs apparaissent dans /properties/:id/availability (champ "blocked")
-- et sont pris en compte dans la vérification anti-double-booking côté client.

CREATE TABLE IF NOT EXISTS property_blocked_dates (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  check_in       DATE NOT NULL,
  check_out      DATE NOT NULL,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT blocked_dates_order CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_blocked_dates_property ON property_blocked_dates(property_id);
