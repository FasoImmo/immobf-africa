"use strict";

const { query, withTransaction } = require("../config/db");

const BASE_COLS = `
  p.id, p.owner_id, p.agency_id, p.type, p.title, p.description,
  p.price, p.currency, p.area_m2, p.bedrooms, p.bathrooms,
  p.country_code, p.city, p.address,
  ST_Y(p.location::geometry) AS lat,
  ST_X(p.location::geometry) AS lng,
  p.status, p.verified, p.boosted_until, p.deposit_pct,
  p.features, p.published_at, p.created_at, p.updated_at
`;

function hydrate(row) {
  if (!row) return null;
  const { lat, lng, ...rest } = row;
  return {
    ...rest,
    location: lat !== null && lng !== null ? { lat, lng } : null,
  };
}

async function create(data) {
  const {
    owner_id, agency_id = null, type, title, description = null,
    price, currency = "XOF", area_m2 = null, bedrooms = null, bathrooms = null,
    country_code = "BF", city, address = null, lat = null, lng = null,
    deposit_pct = 5, features = {},
  } = data;

  const { rows } = await query(
    `INSERT INTO properties
      (owner_id, agency_id, type, title, description, price, currency,
       area_m2, bedrooms, bathrooms, country_code, city, address,
       location, deposit_pct, features)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
       CASE WHEN $14::float IS NOT NULL AND $15::float IS NOT NULL
            THEN ST_SetSRID(ST_MakePoint($15,$14),4326)::geography
            ELSE NULL END,
       $16,$17::jsonb)
     RETURNING ${BASE_COLS}`,
    [
      owner_id, agency_id, type, title, description, price, currency,
      area_m2, bedrooms, bathrooms, country_code, city, address,
      lat, lng, deposit_pct, JSON.stringify(features),
    ]
  );
  return hydrate(rows[0]);
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_COLS} FROM properties p WHERE p.id = $1`,
    [id]
  );
  return hydrate(rows[0]);
}

async function search(filters = {}, { limit = 20, offset = 0 } = {}) {
  const clauses = ["p.status = 'published'"];
  const params = [];
  const push = (sql, v) => { params.push(v); clauses.push(sql.replace("$?", `$${params.length}`)); };

  if (filters.country) push("p.country_code = $?", filters.country);
  if (filters.city) push("LOWER(p.city) = LOWER($?)", filters.city);
  if (filters.type) push("p.type = $?", filters.type);
  if (filters.min_price != null) push("p.price >= $?", filters.min_price);
  if (filters.max_price != null) push("p.price <= $?", filters.max_price);
  if (filters.min_area != null) push("p.area_m2 >= $?", filters.min_area);
  if (filters.bedrooms != null) push("p.bedrooms >= $?", filters.bedrooms);
  if (filters.q) push("(p.title ILIKE '%'||$?||'%' OR p.description ILIKE '%'||$?||'%')", filters.q);
  // Geosearch (km radius)
  if (filters.lat != null && filters.lng != null && filters.radius_km != null) {
    params.push(filters.lng, filters.lat, filters.radius_km * 1000);
    clauses.push(
      `ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($${params.length - 2},$${params.length - 1}),4326)::geography, $${params.length})`
    );
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT ${BASE_COLS}
     FROM properties p
     ${where}
     ORDER BY (p.boosted_until > NOW()) DESC, p.published_at DESC NULLS LAST
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return rows.map(hydrate);
}

async function publish(id, ownerId) {
  const { rows } = await query(
    `UPDATE properties SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING ${BASE_COLS}`,
    [id, ownerId]
  );
  return hydrate(rows[0]);
}

async function updateStatus(id, status) {
  const { rows } = await query(
    `UPDATE properties SET status = $2, updated_at = NOW() WHERE id = $1
     RETURNING ${BASE_COLS}`,
    [id, status]
  );
  return hydrate(rows[0]);
}

async function boost(id, ownerId, days = 7) {
  const { rows } = await query(
    `UPDATE properties
     SET boosted_until = NOW() + ($3 || ' days')::interval, updated_at = NOW()
     WHERE id = $1 AND owner_id = $2
     RETURNING ${BASE_COLS}`,
    [id, ownerId, String(days)]
  );
  return hydrate(rows[0]);
}

async function addPhoto(property_id, url, { is_360 = false, sort_order = 0 } = {}) {
  const { rows } = await query(
    `INSERT INTO property_photos (property_id, url, is_360, sort_order)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [property_id, url, is_360, sort_order]
  );
  return rows[0];
}

async function photosFor(property_id) {
  const { rows } = await query(
    `SELECT id, url, is_360, sort_order FROM property_photos
     WHERE property_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [property_id]
  );
  return rows;
}

module.exports = {
  create, findById, search, publish, updateStatus, boost,
  addPhoto, photosFor, withTransaction,
};
