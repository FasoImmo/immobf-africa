"use strict";

const { query, withTransaction } = require("../config/db");
const { translateProperty } = require("../services/translation");

const BASE_COLS = `
  p.id, p.owner_id, p.agency_id, p.type, p.transaction_type, p.title, p.description,
  p.price, p.currency, p.area_m2, p.bedrooms, p.bathrooms,
  p.country_code, p.city, p.address,
  p.lat, p.lng,
  p.status, p.verified, p.boosted_until, p.deposit_pct,
  p.is_furnished, p.rent_period,
  p.listing_fee_paid_at, p.listing_expires_at,
  p.features, p.published_at, p.created_at, p.updated_at,
  p.title_translations, p.description_translations
`;

const RETURNING_COLS = `
  id, owner_id, agency_id, type, transaction_type, title, description,
  price, currency, area_m2, bedrooms, bathrooms,
  country_code, city, address,
  lat, lng,
  status, verified, boosted_until, deposit_pct,
  is_furnished, rent_period,
  listing_fee_paid_at,
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

async function withTranslation(prop, lang) {
  if (!prop) return null;
  const { title_translations, description_translations, ...clean } = prop;
  if (!lang || lang === "fr") return clean;

  const cachedTitle = title_translations && title_translations[lang];
  const cachedDesc  = description_translations && description_translations[lang];

  if (cachedTitle) {
    return { ...clean, title: cachedTitle, description: cachedDesc || clean.description };
  }

  const { title: translatedTitle, description: translatedDesc } =
    await translateProperty(clean.title, clean.description, lang);

  if (translatedTitle !== clean.title) {
    cacheTranslation(clean.id, lang, translatedTitle, translatedDesc).catch(function() {});
  }

  return { ...clean, title: translatedTitle, description: translatedDesc };
}

async function cacheTranslation(id, lang, title, description) {
  await query(
    `UPDATE properties SET
       title_translations       = title_translations       || $2::jsonb,
       description_translations = description_translations || $3::jsonb
     WHERE id = $1`,
    [id, JSON.stringify({ [lang]: title }), JSON.stringify({ [lang]: description || "" })]
  );
}

async function create(data) {
  const {
    owner_id, agency_id = null,
    transaction_type = "sale", type,
    title, description = null,
    price, currency = "XOF",
    area_m2 = null, bedrooms = null, bathrooms = null,
    country_code = "BF", city, address = null,
    lat = null, lng = null,
    deposit_pct = 5, is_furnished = false, rent_period = null,
    features = {},
  } = data;

  const { rows } = await query(
    `INSERT INTO properties
      (owner_id, agency_id, transaction_type, type, title, description, price, currency,
       area_m2, bedrooms, bathrooms, country_code, city, address,
       lat, lng, deposit_pct, is_furnished, rent_period, features)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb)
     RETURNING ${RETURNING_COLS}`,
    [
      owner_id, agency_id, transaction_type, type, title, description, price, currency,
      area_m2, bedrooms, bathrooms, country_code, city, address,
      lat, lng, deposit_pct, is_furnished, rent_period, JSON.stringify(features),
    ]
  );
  return hydrate(rows[0]);
}

async function findById(id, opts) {
  var options = opts || {};
  const { rows } = await query(
    `SELECT ${BASE_COLS},
       u.phone          AS owner_phone,
       COALESCE(u.whatsapp_number, u.phone) AS owner_whatsapp,
       u.full_name      AS owner_name
     FROM properties p
     LEFT JOIN users u ON u.id = p.owner_id
     WHERE p.id = $1`,
    [id]
  );
  return withTranslation(hydrate(rows[0]), options.lang);
}

async function search(filters, opts) {
  var options = opts || {};
  var limit = options.limit !== undefined ? options.limit : 20;
  var offset = options.offset !== undefined ? options.offset : 0;
  var lang = options.lang;

  // Exclure les annonces expirées (listing_expires_at passé)
  const clauses = [
    "p.status = 'published'",
    "(p.listing_expires_at IS NULL OR p.listing_expires_at > NOW())",
  ];
  const params = [];

  const push = function(sql) {
    var values = Array.prototype.slice.call(arguments, 1);
    values.forEach(function(v) { params.push(v); });
    var i = params.length - values.length + 1;
    clauses.push(sql.replace(/\$\?/g, function() { return "$" + (i++); }));
  };

  if (filters.country) push("p.country_code = $?", filters.country);
  if (filters.city) push("LOWER(p.city) = LOWER($?)", filters.city);
  if (filters.type) push("p.type = $?", filters.type);
  if (filters.transaction_type) push("p.transaction_type = $?", filters.transaction_type);
  if (filters.is_furnished !== undefined) push("p.is_furnished = $?", filters.is_furnished);
  if (filters.min_price != null) push("p.price >= $?", filters.min_price);
  if (filters.max_price != null) push("p.price <= $?", filters.max_price);
  if (filters.min_area != null) push("p.area_m2 >= $?", filters.min_area);
  if (filters.bedrooms != null) push("p.bedrooms >= $?", filters.bedrooms);
  if (filters.q) push("(p.title ILIKE '%'||$?||'%' OR p.description ILIKE '%'||$?||'%')", filters.q, filters.q);

  if (filters.lat != null && filters.lng != null && filters.radius_km != null) {
    const R = 6371;
    const lat0 = parseFloat(filters.lat);
    const lng0 = parseFloat(filters.lng);
    const r = parseFloat(filters.radius_km);
    const dLat = (r / R) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat0 * Math.PI) / 180);
    params.push(lat0 - dLat, lat0 + dLat, lng0 - dLng, lng0 + dLng);
    const b = params.length;
    clauses.push("p.lat BETWEEN $" + (b-3) + " AND $" + (b-2));
    clauses.push("p.lng BETWEEN $" + (b-1) + " AND $" + b);
    params.push(lat0, lng0, r);
    const h = params.length;
    clauses.push("(" + R + " * 2 * asin(sqrt(sin(radians((p.lat - $" + (h-2) + ") / 2)) ^ 2 + cos(radians($" + (h-2) + ")) * cos(radians(p.lat)) * sin(radians((p.lng - $" + (h-1) + ") / 2)) ^ 2))) <= $" + h);
  }

  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  params.push(limit, offset);

  const { rows } = await query(
    "SELECT " + BASE_COLS + " FROM properties p " + where +
    " ORDER BY (p.boosted_until > NOW()) DESC, p.published_at DESC NULLS LAST" +
    " LIMIT $" + (params.length - 1) + " OFFSET $" + params.length,
    params
  );

  const hydrated = rows.map(hydrate);
  return Promise.all(hydrated.map(function(p) { return withTranslation(p, lang); }));
}

/**
 * Publie une annonce.
 * - skipFeeCheck = true : réservé aux webhooks de paiement et aux admins.
 * - Sans skipFeeCheck : vérifie que listing_fee_paid_at est renseigné.
 */
async function publish(id, ownerId, opts) {
  var options = opts || {};
  var skipFeeCheck = options.skipFeeCheck || false;

  if (!skipFeeCheck) {
    // Vérifier que le frais de publication a été payé
    const { rows: check } = await query(
      "SELECT listing_fee_paid_at FROM properties WHERE id = $1 AND owner_id = $2",
      [id, ownerId]
    );
    if (!check.length) return null; // not found / not owner
    if (!check[0].listing_fee_paid_at) {
      const err = new Error("Frais de publication non payé (1 000 FCFA requis)");
      err.statusCode = 402;
      err.code = "payment_required";
      throw err;
    }
  }

  const { rows } = await query(
    "UPDATE properties SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1 AND owner_id = $2 RETURNING " + RETURNING_COLS,
    [id, ownerId]
  );
  return hydrate(rows[0]);
}

/**
 * Marque le frais de publication comme payé ET publie l'annonce automatiquement.
 * Appelé par le webhook de paiement (purpose = 'listing_fee').
 */
async function markListingFeePaid(propertyId) {
  const { rows } = await query(
    `UPDATE properties
     SET listing_fee_paid_at = NOW(),
         status = 'published',
         published_at = COALESCE(published_at, NOW()),
         updated_at = NOW()
     WHERE id = $1
     RETURNING ${RETURNING_COLS}`,
    [propertyId]
  );
  return hydrate(rows[0]);
}

async function updateStatus(id, status) {
  const { rows } = await query(
    "UPDATE properties SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING " + RETURNING_COLS,
    [id, status]
  );
  return hydrate(rows[0]);
}

async function boost(id, ownerId, days) {
  var d = days || 7;
  const { rows } = await query(
    "UPDATE properties SET boosted_until = NOW() + ($3 || ' days')::interval, updated_at = NOW() WHERE id = $1 AND owner_id = $2 RETURNING " + RETURNING_COLS,
    [id, ownerId, String(d)]
  );
  return hydrate(rows[0]);
}

async function addPhoto(property_id, url, opts) {
  var options = opts || {};
  const { rows } = await query(
    "INSERT INTO property_photos (property_id, url, is_360, sort_order) VALUES ($1,$2,$3,$4) RETURNING *",
    [property_id, url, options.is_360 || false, options.sort_order || 0]
  );
  return rows[0];
}

async function photosFor(property_id) {
  const { rows } = await query(
    "SELECT id, url, is_360, sort_order FROM property_photos WHERE property_id = $1 ORDER BY sort_order ASC, created_at ASC",
    [property_id]
  );
  return rows;
}

// Définir la date d'expiration (30 jours à partir d'aujourd'hui ou renouvellement)
async function setExpiry(id, days) {
  var d = days || 30;
  const { rows } = await query(
    `UPDATE properties
     SET listing_expires_at = GREATEST(COALESCE(listing_expires_at, NOW()), NOW()) + ($2 || ' days')::interval,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, listing_expires_at`,
    [id, String(d)]
  );
  return rows[0];
}

// Annonces d'un propriétaire avec statut abonnement
async function listForOwner(owner_id) {
  const { rows } = await query(
    `SELECT ${BASE_COLS},
       CASE
         WHEN listing_expires_at IS NULL THEN 'no_subscription'
         WHEN listing_expires_at < NOW() THEN 'expired'
         WHEN listing_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
         ELSE 'active'
       END AS subscription_status,
       EXTRACT(DAY FROM (listing_expires_at - NOW()))::int AS days_remaining
     FROM properties p
     WHERE p.owner_id = $1
     ORDER BY p.created_at DESC`,
    [owner_id]
  );
  return rows.map(hydrate);
}

module.exports = {
  create, findById, search, publish, markListingFeePaid, updateStatus, boost,
  addPhoto, photosFor, setExpiry, listForOwner, withTransaction,
};
