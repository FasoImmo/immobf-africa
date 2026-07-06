"use strict";

const { query } = require("../config/db");

/**
 * SavedSearch — recherches sauvegardées pour alertes email.
 */

/**
 * Crée ou ignore si la combinaison email+filtres existe déjà.
 * Retourne la ligne créée ou existante.
 */
async function create(email, filters) {
  const { rows } = await query(
    `INSERT INTO saved_searches (email, filters)
     VALUES ($1, $2)
     ON CONFLICT (email, (filters::text)) DO NOTHING
     RETURNING *`,
    [email.toLowerCase().trim(), JSON.stringify(filters)]
  );
  if (rows[0]) return rows[0];
  // Conflit = déjà inscrit avec ces filtres
  const existing = await query(
    "SELECT * FROM saved_searches WHERE email = $1 AND filters::text = $2::text",
    [email.toLowerCase().trim(), JSON.stringify(filters)]
  );
  return existing.rows[0] || null;
}

/**
 * Liste toutes les recherches sauvegardées à traiter (pas encore envoyées
 * aujourd'hui ou jamais envoyées).
 */
async function findPending() {
  const { rows } = await query(
    `SELECT * FROM saved_searches
     WHERE last_sent_at IS NULL
        OR last_sent_at < NOW() - INTERVAL '23 hours'
     ORDER BY last_sent_at NULLS FIRST`
  );
  return rows;
}

/**
 * Marque la recherche comme envoyée maintenant.
 */
async function markSent(id) {
  await query(
    "UPDATE saved_searches SET last_sent_at = NOW() WHERE id = $1",
    [id]
  );
}

/**
 * Supprime une inscription (lien de désabonnement).
 */
async function remove(id) {
  await query("DELETE FROM saved_searches WHERE id = $1", [id]);
}

module.exports = { create, findPending, markSent, remove };
