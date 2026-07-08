-- Migration 023 : Ajout du téléphone de paiement sur les transactions
-- Permet d'afficher le numéro de téléphone dans la copie facture annonceur
-- même quand le profil utilisateur n'a pas de téléphone renseigné.
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30) DEFAULT NULL;
