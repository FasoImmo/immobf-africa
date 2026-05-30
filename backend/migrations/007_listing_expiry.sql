-- Migration 007 : abonnement mensuel — date d'expiration des annonces
ALTER TABLE properties ADD COLUMN IF NOT EXISTS listing_expires_at TIMESTAMPTZ;

-- Les annonces déjà publiées sans expiry reçoivent 30 jours à partir de maintenant
UPDATE properties
SET listing_expires_at = NOW() + INTERVAL '30 days'
WHERE status = 'published' AND listing_expires_at IS NULL;
