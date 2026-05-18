"use strict";

const { query, withTransaction } = require("../config/db");
const { translateProperty } = require("../services/translation");

// Colonnes pour SELECT avec alias de table (FROM properties p)
const BASE_COLS = `
  p.id, p.owner_id, p.agency_id, p.type, p.title, p.description,
  p.price, p.currency, p.area_m2, p.bedrooms, p.bathrooms,
  p.country_code, p.city, p.address,
  p.lat, p.lng,
  p.status, p.verified, p.boosted_until, p.deposit_pct,
  p.features, p.published_at, p.created_at, p.updated_at,
  p.title_translations, p.description_translations
`;

// Colonnes pour INSERT...RETURNING (pas d'alias de table)
const RETURNING_COLS = `
  id, owner_id, agency_id, type, title, description,
  price, currency, area_m2, bedrooms, bathrooms,
  country_code, city, address,
  lat, lng,
  status, verified, boosted_until, deposit_pct,
  features, published_at, created_at, updated_at,
  title_translations, description_translations
`;

function hydrate(row) {
  if (!row) return null;
  const { lat, lng, ...rest } = row;
  return {
    ...rest,
    location:
      lat !== null && lat !== undefined && lng !== null && lng !== undefined
        ? { lat: parseFloat(lat), lng: parseFloat(lng) }
        : null,
  };
}

/**
 * Applique la traduction à une propriété hydratée.
 * 1. Si la traduction est déjà en cache (title_translations.en) → l'utilise.
 * 2. Sinon → appelle DeepL, stocke en cache (non-bloquant), retourne.
 * 3. Si lang=fr ou pas de lang → retourne l'original.
 *
 * Supprime title_translations et description_translations de la réponse finale.
 */
async function withTranslation(prop, lang) {
  if (!prop) return null;
  const { title_translations, description_translations, ...clean } = prop;

  if (!lang || lang === "fr") return clean;

  // Chercher en cache
  const cachedTitle = title_translations?.[lang];
  const cachedDesc  = description_translations?.[lang];

  if (cachedTitle) {
    // Cache hit — pas d'appel DeepL
    return {
      ...clean,
      title: cachedTitle,
      description: cachedDesc || clean.description,
    };
  }

  // Cache miss — appel DeepL
  const { title: translatedTitle, description: translatedDesc } =
    await translateProperty(clean.title, clean.description, lang);

  // Sauvegarder en cache de façon non-bloquante (ne ralentit pas la réponse)
  if (translatedTitle !== clean.title) {
    cacheTranslation(clean.id, lang, translatedTitle, translatedDesc).catch(() => {});
  }

  return {
    ...clean,
    title: translatedTitle,
    description: translatedDesc,
  };
}

/**
 * Persiste une traduction en base (JSONB merge).
 */
async function cacheTranslation(id, lang, title, description) {
  await query(
    `UPDATE properties SET
       title_translations       = title_translations       || $2::jsonb,
       description_translations = description_translations || $3::jsonb
     WHERE id = $1`,
    [
      id,
      JSON.stringify({ [lang]: title }),
      JSON.stringify({ [lang]: description || "" }),
    ]
  );
}

async function create(data) {
  const {
    owner_id,
    agency_id = null,
    type,
    title,
    description = null,
    price,
    currency = "XOF",
    area_m2 = null,
    bedrooms = null,
    bathrooms = null,
    country_code = "BF",
    city,
    address = null,
    lat = null,
    lng = null,
    deposit_pct = 5,
    features = {},
  } = data;

  const { rows } = await query(
    `INSERT INTO properties
      (owner_id, agency_id, type, title, description, price, currency,
       area_m2, bedrooms, bathrooms, country_code, city, address,
       lat, lng, deposit_pct, features)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
     RETURNING ${RETURNING_COLS}`,
    [
      owner_id, agency_id, type, title, description, price, currency,
      area_m2, bedrooms, bathrooms, country_code, city, address,
      lat, lng, deposit_pct, JSON.stringify(features),
    ]
  );
  return hydrate(rows[0]);
}

async function findById(id, { lang } = {}) {
  const { rows } = await query(
    `SELECT ${BASE_COLS} FROM properties p WHERE p.id = $1`,
    [id]
  );
  return withTranslation(hydrate(rows[0]), lang);
}

async function search(filters = {}, { limit = 20, offset = 0, lang } = {}) {
  const clauses = ["p.status = 'published'"];
  const params = [];

  const push = (sql, ...values) => {
    values.forEach((v) => params.push(v));
    let i = params.length - values.length + 1;
    clauses.push(sql.replace(/\$\?/g, () => `$${i++}`));
  };

  if (filters.country) push("p.country_code = $?", filters.country);
  if (filters.city) push("LOWER(p.city) = LOWER($?)", filters.city);
  if (filters.type) push("p.type = $?", filters.type);
  if (filters.min_price != null) push("p.price >= $?", filters.min_price);
  if (filters.max_price != null) push("p.price <= $?", filters.max_price);
  if (filters.min_area != null) push("p.area_m2 >= $?", filters.min_area);
  if (filters.bedrooms != null) push("p.bedrooms >= $?", filters.bedrooms);
  if (filters.q) push("(p.title ILIKE '%'||$?||'%' OR p.description ILIKE '%'||$?||'%')", filters.q, filters.q);

  // Géosearch radius sans PostGIS — bounding box + Haversine exact en SQL pur
  if (filters.lat != null && filters.lng != null && filters.radius_km != null) {
    const R = 6371; // rayon Terre en km
    const lat0 = parseFloat(filters.lat);
    const lng0 = parseFloat(filters.lng);
    const r = parseFloat(filters.radius_km);

    const dLat = (r / R) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat0 * Math.PI) / 180);

    // Bounding box rapide (utilise l'index lat/lng)
    params.push(lat0 - dLat, lat0 + dLat, lng0 - dLng, lng0 + dLng);
    const b = params.length;
    clauses.push(
      `p.lat BETWEEN $${b - 3} AND $${b - 2}`,
      `p.lng BETWEEN $${b - 1} AND $${b}`
    );

    // Haversine exact (filtre final après bounding box)
    params.push(lat0, lng0, r);
    const h = params.length;
    clauses.push(`
      (${R} * 2 * asin(sqrt(
        sin(radians((p.lat - $${h - 2}) / 2)) ^ 2
        + cos(radians($${h - 2})) * cos(radians(p.lat)