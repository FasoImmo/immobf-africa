"use strict";

const { query } = require("../config/db");

/**
 * Modèle de gestion des fournisseurs de paiement.
 * La table payment_providers ne contient que les overrides explicites :
 * si un fournisseur n'y figure pas il est considéré ACTIF par défaut.
 */

async function list() {
  const { rows } = await query(
    `SELECT id, enabled, scheduled_disable_at, scheduled_enable_at,
            disabled_reason, updated_at
     FROM payment_providers
     ORDER BY id`
  );
  return rows;
}

async function get(id) {
  const { rows } = await query(
    `SELECT id, enabled, scheduled_disable_at, scheduled_enable_at,
            disabled_reason, updated_at
     FROM payment_providers WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function upsert(id, { enabled, scheduled_disable_at, scheduled_enable_at, disabled_reason }) {
  const { rows } = await query(
    `INSERT INTO payment_providers
       (id, enabled, scheduled_disable_at, scheduled_enable_at, disabled_reason, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       enabled               = EXCLUDED.enabled,
       scheduled_disable_at  = EXCLUDED.scheduled_disable_at,
       scheduled_enable_at   = EXCLUDED.scheduled_enable_at,
       disabled_reason       = EXCLUDED.disabled_reason,
       updated_at            = NOW()
     RETURNING *`,
    [
      id,
      enabled !== undefined ? enabled : true,
      scheduled_disable_at || null,
      scheduled_enable_at  || null,
      disabled_reason      || null,
    ]
  );
  return rows[0];
}

/**
 * Vérifie si un fournisseur est actuellement actif.
 * Retourne TRUE si pas de ligne dans la table (défaut = actif).
 */
async function isEnabled(id) {
  const row = await get(id);
  if (!row) return true; // absent = actif par défaut
  return row.enabled === true;
}

/**
 * Traite les basculements programmés.
 * Appelé par le cron toutes les minutes.
 * Retourne la liste des fournisseurs dont le statut a changé.
 */
async function processScheduled() {
  const now = new Date();
  const changed = [];

  // Désactivations programmées
  const { rows: toDisable } = await query(
    `SELECT id FROM payment_providers
     WHERE enabled = TRUE
       AND scheduled_disable_at IS NOT NULL
       AND scheduled_disable_at <= $1`,
    [now]
  );
  for (const row of toDisable) {
    await query(
      `UPDATE payment_providers
       SET enabled = FALSE, scheduled_disable_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    changed.push({ id: row.id, action: "disabled" });
  }

  // Activations programmées
  const { rows: toEnable } = await query(
    `SELECT id FROM payment_providers
     WHERE enabled = FALSE
       AND scheduled_enable_at IS NOT NULL
       AND scheduled_enable_at <= $1`,
    [now]
  );
  for (const row of toEnable) {
    await query(
      `UPDATE payment_providers
       SET enabled = TRUE, scheduled_enable_at = NULL,
           disabled_reason = NULL, updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    changed.push({ id: row.id, action: "enabled" });
  }

  return changed;
}

module.exports = { list, get, upsert, isEnabled, processScheduled };
