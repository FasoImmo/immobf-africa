"use strict";

const { query } = require("../config/db");
const argon2 = require("argon2");

const PUBLIC_FIELDS = `
  id, email, phone, full_name, role, agency_id, country_code, locale,
  phone_verified, created_at
`;

async function create({ email, phone, password, full_name, role = "buyer", country_code = "BF", locale = "fr", agency_id = null }) {
  const password_hash = await argon2.hash(password, { type: argon2.argon2id });
  const { rows } = await query(
    `INSERT INTO users (email, phone, password_hash, full_name, role, agency_id, country_code, locale)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING ${PUBLIC_FIELDS}`,
    [email, phone, password_hash, full_name, role, agency_id, country_code, locale]
  );
  return rows[0];
}

async function findByPhone(phone) {
  const { rows } = await query(
    `SELECT id, email, phone, password_hash, full_name, role, agency_id, country_code, locale, phone_verified
     FROM users WHERE phone = $1`,
    [phone]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function verifyPassword(user, password) {
  if (!user || !user.password_hash) return false;
  return argon2.verify(user.password_hash, password);
}

async function markPhoneVerified(id) {
  await query(`UPDATE users SET phone_verified = TRUE WHERE id = $1`, [id]);
}

async function updatePassword(phone, newPassword) {
  const password_hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  await query(`UPDATE users SET password_hash = $1 WHERE phone = $2`, [password_hash, phone]);
}

module.exports = { create, findByPhone, findById, verifyPassword, markPhoneVerified, updatePassword };
