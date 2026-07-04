-- Migration 014 : table de réservations pour blocage calendrier
-- Uniquement pour les annonces de type rent_short (court séjour).
-- Créée automatiquement lors de la confirmation d'un paiement commission réussi.

CREATE TABLE IF NOT EXISTS bookings (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id    UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  check_in       DATE NOT NULL,
  check_out      DATE NOT NULL,
  status         TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('confirmed', 'cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookings_dates_check CHECK (check_out > check_in)
);

CREATE INDEX IF NOT EXISTS idx_bookings_property ON bookings(property_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates    ON bookings(property_id, check_in, check_out);
