-- Migration 006 : ajouter 'listing_fee' aux valeurs autorisées de transactions.purpose
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_purpose_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_purpose_check
  CHECK (purpose IN ('deposit','escrow','boost','commission','subscription','listing_fee'));
