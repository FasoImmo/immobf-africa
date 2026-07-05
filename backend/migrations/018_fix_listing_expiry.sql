-- Migration 018 : corriger les annonces publiées dont listing_expires_at est dépassé.
-- Cause : migration 007 a attribué 30 jours à toutes les annonces existantes ;
-- ces 30 jours sont écoulés et le filtre de recherche les exclut.
-- Solution : on remet listing_expires_at = NULL pour les annonces publiées expirées
-- (elles s'affichent indéfiniment jusqu'à la mise en place d'un abonnement actif).
UPDATE properties
SET listing_expires_at = NULL,
    updated_at          = NOW()
WHERE status            = 'published'
  AND listing_expires_at IS NOT NULL
  AND listing_expires_at < NOW();
