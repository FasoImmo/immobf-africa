-- Migration 026 : tracking alertes qualité annonces
-- Stocke la date du dernier email d'alerte qualité envoyé à l'annonceur
-- pour chaque annonce (anti-spam : un email max tous les 7 jours par annonce).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS quality_alert_sent_at TIMESTAMPTZ DEFAULT NULL;
