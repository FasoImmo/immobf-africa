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

module.exports = { create, listForProperty, hasConflict, cancelByTransaction };
