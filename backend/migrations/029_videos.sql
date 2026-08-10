-- Migration 029 : table property_videos
-- Stockage des vidéos courtes associées à une annonce (uploadées ou enregistrées via caméra/webcam).
-- Max 3 vidéos par annonce (contrainte appliquée côté application).

CREATE TABLE IF NOT EXISTS property_videos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  cloudinary_id TEXT,          -- public_id Cloudinary pour pouvoir supprimer
  duration_s    INTEGER,       -- durée en secondes (optionnel, rempli par Cloudinary)
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_videos_property ON property_videos(property_id);
