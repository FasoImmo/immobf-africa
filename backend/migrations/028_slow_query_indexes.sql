-- Migration 028 : Index pour les slow queries des crons (28/07/2026)
--
-- Problème : deux requêtes cron prennent ~1 seconde chacune sans index :
--
-- 1. Cron payment_providers (toutes les minutes) :
--    SELECT id FROM payment_providers
--    WHERE enabled = TRUE AND scheduled_disable_at IS NOT NULL AND scheduled_disable_at <= $1
--    → index partiel sur scheduled_disable_at (WHERE NOT NULL)
--
-- 2. Cron réconciliation (toutes les 5 min) :
--    SELECT ... FROM transactions
--    WHERE status = 'pending' AND external_id IS NOT NULL AND created_at < NOW() - INTERVAL '3 minutes'
--    → index partiel sur (created_at) WHERE status = 'pending' AND external_id IS NOT NULL

-- Index 1 : désactivations programmées
CREATE INDEX IF NOT EXISTS idx_pp_scheduled_disable
  ON payment_providers (scheduled_disable_at)
  WHERE scheduled_disable_at IS NOT NULL;

-- Index 2 : activations programmées
CREATE INDEX IF NOT EXISTS idx_pp_scheduled_enable
  ON payment_providers (scheduled_enable_at)
  WHERE scheduled_enable_at IS NOT NULL;

-- Index 3 : réconciliation transactions pendantes
CREATE INDEX IF NOT EXISTS idx_tx_pending_reconciliation
  ON transactions (created_at ASC)
  WHERE status = 'pending' AND external_id IS NOT NULL;
