-- Migration 027 : contrôle admin de l'éligibilité à la commission par annonce
-- NULL  = règle par défaut (meublé résidentiel en location)
-- TRUE  = commission forcée ON (override admin)
-- FALSE = commission forcée OFF (override admin)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission_enabled BOOLEAN DEFAULT NULL;
