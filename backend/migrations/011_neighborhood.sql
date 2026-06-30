-- Ajoute un champ "quartier / zone" pour préciser la localisation au sein
-- d'une ville (ex : Ouaga 2000, Patte d'Oie). Permet une recherche plus fine
-- que la seule ville, utile pour les grandes agglomérations.
ALTER TABLE properties ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150);
