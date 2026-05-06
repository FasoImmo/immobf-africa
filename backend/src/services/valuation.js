"use strict";

const { query } = require("../config/db");

/**
 * Estimation de prix naïve (médiane locale + ajustement surface).
 * Remplaçable par un modèle ML (XGBoost / LightGBM) en V2.
 */
async function estimate({ country_code = "BF", city, type, area_m2 }) {
  const { rows } = await query(
    `SELECT price, area_m2
     FROM properties
     WHERE country_code = $1 AND LOWER(city) = LOWER($2) AND type = $3
       AND status IN ('published','sold') AND price > 0
     ORDER BY created_at DESC
     LIMIT 100`,
    [country_code, city, type]
  );

  if (!rows.length) {
    return { estimate: null, confidence: 0, comparables: 0 };
  }

  const pricePerM2 = rows
    .filter((r) => r.area_m2 && Number(r.area_m2) > 0)
    .map((r) => Number(r.price) / Number(r.area_m2))
    .sort((a, b) => a - b);

  if (!pricePerM2.length) {
    const prices = rows.map((r) => Number(r.price)).sort((a, b) => a - b);
    return { estimate: prices[Math.floor(prices.length / 2)], confidence: 0.3, comparables: prices.length };
  }

  const median = pricePerM2[Math.floor(pricePerM2.length / 2)];
  const estimate = area_m2 ? median * Number(area_m2) : median;
  const confidence = Math.min(0.95, 0.3 + 0.05 * pricePerM2.length);
  return { estimate: Math.round(estimate), confidence, comparables: pricePerM2.length, median_per_m2: Math.round(median) };
}

module.exports = { estimate };
