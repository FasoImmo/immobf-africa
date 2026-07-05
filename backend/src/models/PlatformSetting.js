"use strict";
const { query } = require("../db");

async function get(key) {
  const { rows } = await query("SELECT value FROM platform_settings WHERE key = $1", [key]);
  return rows[0]?.value ?? null;
}

async function set(key, value) {
  await query(
    `INSERT INTO platform_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value == null ? null : String(value)]
  );
}

async function getPromo() {
  const { rows } = await query("SELECT key, value FROM platform_settings WHERE key LIKE 'promo_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const now = new Date();
  const start = m.promo_start ? new Date(m.promo_start) : null;
  const end   = m.promo_end   ? new Date(m.promo_end)   : null;
  const active =
    m.promo_active === "true" &&
    (!start || now >= start) &&
    (!end   || now <= end);
  return {
    active,
    configured: m.promo_active === "true",
    start: m.promo_start || null,
    end:   m.promo_end   || null,
    message_fr: m.promo_message_fr || null,
    message_en: m.promo_message_en || null,
  };
}

module.exports = { get, set, getPromo };
