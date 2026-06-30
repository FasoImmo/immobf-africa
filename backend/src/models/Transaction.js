"use strict";

const { query } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

async function create({
  buyer_id = null, property_id = null, agency_id = null,
  provider, purpose, amount, currency = "XOF",
  reference = null, payment_url = null, ussd_code = null, customer_email = null,
}) {
  const ref = reference || `IMO-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  const { rows } = await query(
    `INSERT INTO transactions
      (buyer_id, property_id, agency_id, provider, purpose, amount, currency,
       reference, payment_url, ussd_code, customer_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [buyer_id, property_id, agency_id, provider, purpose, amount, currency, ref, payment_url, ussd_code, customer_email]
  );
  return rows[0];
}

async function findByReference(reference) {
  const { rows } = await query(`SELECT * FROM transactions WHERE reference = $1`, [reference]);
  return rows[0] || null;
}

async function findByExternalId(provider, external_id) {
  const { rows } = await query(
    `SELECT * FROM transactions WHERE provider = $1 AND external_id = $2`,
    [provider, external_id]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM transactions WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateStatus(id, status, { external_id = null, raw_payload = null, payment_url = null } = {}) {
  const { rows } = await query(
    `UPDATE transactions
     SET status = $2,
         external_id = COALESCE($3, external_id),
         payment_url = COALESCE($5, payment_url),
         raw_payload = COALESCE($4::jsonb, raw_payload),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, external_id, raw_payload ? JSON.stringify(raw_payload) : null, payment_url]
  );
  return rows[0] || null;
}

async function logEvent(transaction_id, kind, payload) {
  await query(
    `INSERT INTO payment_events (transaction_id, kind, payload) VALUES ($1,$2,$3::jsonb)`,
    [transaction_id, kind, JSON.stringify(payload)]
  );
}

async function findLatestEvent(transaction_id, kind) {
  const { rows } = await query(
    `SELECT payload FROM payment_events
     WHERE transaction_id = $1 AND kind = $2
     ORDER BY created_at DESC LIMIT 1`,
    [transaction_id, kind]
  );
  return rows[0]?.payload || null;
}

async function listForUser(user_id, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT * FROM transactions WHERE buyer_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [user_id, limit, offset]
  );
  return rows;
}

module.exports = {
  create, findByReference, findByExternalId, findById, updateStatus,
  logEvent, findLatestEvent, listForUser,
};
