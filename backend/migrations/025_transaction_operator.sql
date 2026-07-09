-- Migration 025 : colonne operator sur transactions
-- Stocke le mode de paiement choisi (orange, moov, wave, card, mpesa, etc.)
-- pour permettre les statistiques par mode de paiement dans le dashboard admin.
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS operator TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_operator ON transactions(operator);
