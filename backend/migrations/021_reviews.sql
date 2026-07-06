-- Migration 021 : avis & notations annonceurs
-- Un acheteur peut laisser un avis (1-5 étoiles + commentaire) par annonce.
-- UNIQUE (property_id, reviewer_id) évite les doublons.

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id   UUID        NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  reviewer_id   UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  seller_id     UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  rating        SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT        CHECK (comment IS NULL OR (length(comment) >= 5 AND length(comment) <= 1000)),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (property_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_seller   ON reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);
