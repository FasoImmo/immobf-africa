"use strict";

const { query } = require("../config/db");

async function create(transaction_id, release_due_at = null) {
  const { rows } = await query(
    `INSERT INTO escrows (transaction_id, release_due_at) VALUES ($1, $2)
     ON CONFLICT (transaction_id) DO NOTHING
     RETURNING *`,
    [transaction_id, release_due_at]
  );
  return rows[0] || null;
}

async function release(id, notes = null) {
  const { rows } = await query(
    `UPDATE escrows SET status = 'released', released_at = NOW(), notes = COALESCE($2, notes)
     WHERE id = $1 RETURNING *`,
    [id, notes]
  );
  return rows[0];
}

async function refund(id, notes = null) {
  const { rows } = await query(
    `UPDATE escrows SET status = 'refunded', released_at = NOW(), notes = COALESCE($2, notes)
     WHERE id = $1 RETURNING *`,
    [id, notes]
  );
  return rows[0];
}

async function findByTransaction(transaction_id) {
  const { rows } = await query(`SELECT * FROM escrows WHERE transaction_id = $1`, [transaction_id]);
  return rows[0] || null;
}

module.exports = { create, release, refund, findByTransaction };
