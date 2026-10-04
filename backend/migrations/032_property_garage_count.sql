-- Migration 032: Add garage_count column to properties table
-- Stores number of garage spaces for house/apartment/villa listings

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS garage_count INTEGER DEFAULT NULL;

COMMENT ON COLUMN properties.garage_count IS
  'Nombre de places de garage. NULL = non renseigné. Applicable aux maisons, appartements et villas.';
