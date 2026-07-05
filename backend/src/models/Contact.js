"use strict";

const { query } = require("../config/db");

/**
 * Upsert a contact from a payment event.
 * Creates or updates based on email (case-insensitive).
 * Non-null incoming fields overwrite stored values; nulls keep the stored value.
 */
async function upsert({ user_id = null, email, phone = null, name = null, country = null, language = null }) {
  if (!email) return null;
  const { rows } = await query(
    `INSERT INTO contacts (user_id, email, phone, name, country, language, last_seen, visit_count)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), 1)
     ON CONFLICT (LOWER(email)) DO UPDATE SET
       user_id     = COALESCE(EXCLUDED.user_id,  contacts.user_id),
       phone       = COALESCE(EXCLUDED.phone,    contacts.phone),
       name        = COALESCE(EXCLUDED.name,     contacts.name),
       country     = COALESCE(EXCLUDED.country,  contacts.country),
       language    = COALESCE(EXCLUDED.language, contacts.language),
       visit_count = contacts.visit_count + 1,
       last_seen   = NOW()
     RETURNING *`,
    [user_id, email.trim().toLowerCase(), phone, name, country, language]
  );
  return rows[0] || null;
}

/**
 * Update preferences JSONB (merge, not replace).
 * preferences: { types: [...], cities: [...], budget_max: N }
 */
async function mergePreferences(email, prefs) {
  if (!email || !prefs) return;
  await query(
    `UPDATE contacts
     SET preferences = preferences || $2::jsonb, last_seen = NOW()
     WHERE LOWER(email) = LOWER($1)`,
    [email, JSON.stringify(prefs)]
  );
}

/**
 * List all contacts with pagination.
 * Optionally filter by country or language.
 */
async function list({ limit = 100, offset = 0, country = null, language = null } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (country)  { conditions.push(`country = $${idx++}`);       params.push(country); }
  if (language) { conditions.push(`language = $${idx++}`);      params.push(language); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  params.push(limit, offset);
  const { rows } = await query(
    `SELECT id, user_id, email, phone, name, country, language,
            visit_count, last_seen, preferences, created_at
     FROM contacts
     ${where}
     ORDER BY last_seen DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params
  );
  return rows;
}

async function count({ country = null, language = null } = {}) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (country)  { conditions.push(`country = $${idx++}`);  params.push(country); }
  if (language) { conditions.push(`language = $${idx++}`); params.push(language); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const { rows } = await query(`SELECT COUNT(*) AS n FROM contacts ${where}`, params);
  return Number(rows[0]?.n || 0);
}

module.exports = { upsert, mergePreferences, list, count };
