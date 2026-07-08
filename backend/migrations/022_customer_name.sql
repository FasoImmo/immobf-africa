-- Migration 022 : Ajout du nom optionnel du client sur les transactions
-- Permet d'afficher le nom du client dans la copie facture annonceur
-- pour les paiements invités (sans compte), où full_name n'est pas disponible.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(120) DEFAULT NULL;
