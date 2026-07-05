"use strict";
const { query } = require("../config/db");

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


const cfg = require("../config");

// Valeurs par défaut (depuis env/config) — utilisées si jamais modifiées en DB
const PRICING_DEFAULTS = {
  listing_1m:  cfg.commissions.listingPlans[1],
  listing_3m:  cfg.commissions.listingPlans[3],
  listing_6m:  cfg.commissions.listingPlans[6],
  listing_12m: cfg.commissions.listingPlans[12],
  commission_pct: cfg.commissions.appPct,
};

async function getPricing() {
  const { rows } = await query("SELECT key, value FROM platform_settings WHERE key LIKE 'pricing_%'");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const n = (k) => (m[k] != null ? Number(m[k]) : PRICING_DEFAULTS[k.replace("pricing_", "")]);
  return {
    listing_1m:     n("pricing_listing_1m"),
    listing_3m:     n("pricing_listing_3m"),
    listing_6m:     n("pricing_listing_6m"),
    listing_12m:    n("pricing_listing_12m"),
    commission_pct: n("pricing_commission_pct"),
    listingPlans: {
      1:  n("pricing_listing_1m"),
      3:  n("pricing_listing_3m"),
      6:  n("pricing_listing_6m"),
      12: n("pricing_listing_12m"),
    },
  };
}

async function setPricing({ listing_1m, listing_3m, listing_6m, listing_12m, commission_pct }) {
  const pairs = [
    ["pricing_listing_1m",      listing_1m],
    ["pricing_listing_3m",      listing_3m],
    ["pricing_listing_6m",      listing_6m],
    ["pricing_listing_12m",     listing_12m],
    ["pricing_commission_pct",  commission_pct],
  ];
  for (const [k, v] of pairs) {
    if (v != null) await set(k, String(Number(v)));
  }
}

module.exports = { get, set, getPromo, getPricing, setPricing };
