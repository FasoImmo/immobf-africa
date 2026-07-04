"use strict";
const { query } = require("../config/db");

/**
 * Crée une réservation (après paiement commission réussi pour un court séjour).
 * check_in / check_out sont des objets Date ou chaînes ISO YYYY-MM-DD.
 */
async function create(propertyId, transactionId, checkIn, checkOut) {
  const { rows } = await query(
    `INSERT INTO bookings (property_id, transaction_id, check_in, check_out)
     VALUES ($1, $2, $3::date, $4::date)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [propertyId, transactionId, checkIn, checkOut]
  );
  return rows[0] || null;
}

/**
 * Retourne les réservations confirmées à venir (ou en cours) pour une annonce.
 * Utilisé par l'endpoint public GET /properties/:id/availability.
 */
async function listForProperty(propertyId) {
  const { rows } = await query(
    `SELECT check_in, check_out
     FROM bookings
     WHERE property_id = $1
       AND status = 'confirmed'
       AND check_out > CURRENT_DATE
     ORDER BY check_in ASC`,
    [propertyId]
  );
  return rows;
}

/**
 * Vérifie si une plage de dates est en conflit avec une réservation existante.
 * Retourne true si occupé.
 */
async function hasConflict(propertyId, checkIn, checkOut) {
  const { rows } = await query(
    `SELECT 1 FROM bookings
     WHERE property_id = $1
       AND status = 'confirmed'
       AND check_in < $3::date
       AND check_out > $2::date
     LIMIT 1`,
    [propertyId, checkIn, checkOut]
  );
  return rows.length > 0;
}

/**
 * Annule une réservation (par transaction_id, ex : remboursement).
 */
async function cancelByTransaction(transactionId) {
  await query(
    `UPDATE bookings SET status = 'cancelled'
     WHERE transaction_id = $1`,
    [transactionId]
  );
}

/**
 * Retourne les blocs manuels (saisis par l'annonceur) à venir pour une annonce.
 * Utilisé par GET /properties/:id/availability (champ "blocked") et par
 * GET /my/listings/:id/block-dates.
 */
async function listBlocksForProperty(propertyId) {
  const { rows } = await query(
    `SELECT id, check_in, check_out, note, created_at
     FROM property_blocked_dates
     WHERE property_id = $1
       AND check_out > CURRENT_DATE
     ORDER BY check_in ASC`,
    [propertyId]
  );
  return rows;
}

/**
 * Crée un bloc manuel pour une annonce.
 * check_in / check_out : chaînes YYYY-MM-DD ou objets Date.
 */
async function addBlock(propertyId, checkIn, checkOut, note) {
  const { rows } = await query(
    `INSERT INTO property_blocked_dates (property_id, check_in, check_out, note)
     VALUES ($1, $2::date, $3::date, $4)
     RETURNING id, check_in, check_out, note, created_at`,
    [propertyId, checkIn, checkOut, note || null]
  );
  return rows[0];
}

/**
 * Supprime un bloc manuel.
 * propertyId est requis pour vérifier l'appartenance (sécurité).
 */
async function removeBlock(blockId, propertyId) {
  const { rows } = await query(
    `DELETE FROM property_blocked_dates
     WHERE id = $1 AND property_id = $2
     RETURNING id`,
    [blockId, propertyId]
  );
  return rows[0] || null;
}

module.exports = { create, listForProperty, hasConflict, cancelByTransaction, listBlocksForProperty, addBlock, removeBlock };
