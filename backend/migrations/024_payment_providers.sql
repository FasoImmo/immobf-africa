-- Migration 024 : gestion admin des fournisseurs de paiement
-- Permet de bloquer / activer / programmer un fournisseur sans redéploiement.
CREATE TABLE IF NOT EXISTS payment_providers (
  id                    VARCHAR(60)   PRIMARY KEY,
  enabled               BOOLEAN       NOT NULL DEFAULT TRUE,
  scheduled_disable_at  TIMESTAMPTZ   DEFAULT NULL,
  scheduled_enable_at   TIMESTAMPTZ   DEFAULT NULL,
  disabled_reason       TEXT          DEFAULT NULL,
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
