"use strict";

const { query } = require("../config/db");

// ─── Enregistrer une vue / événement sur une annonce ─────────────────────────
async function trackView(req, res) {
  const { id: property_id } = req.params;
  const {
    event_type = "view",
    session_id = null,
    referrer = null,
  } = req.body || {};

  const user_id = req.user?.id || null;
  const country_code = (req.headers["cf-ipcountry"] || req.query.country || "BF").slice(0, 2).toUpperCase();

  // Dédoublonnage : une vue par session + propriété + heure (évite le spam)
  if (session_id) {
    const { rows } = await query(
      `SELECT id FROM property_views
       WHERE property_id = $1 AND session_id = $2 AND event_type = $3
         AND created_at > NOW() - INTERVAL '1 hour'
       LIMIT 1`,
      [property_id, session_id, event_type]
    );
    if (rows.length > 0) return res.json({ ok: true, deduplicated: true });
  }

  await query(
    `INSERT INTO property_views (property_id, user_id, session_id, event_type, country_code, referrer)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [property_id, user_id, session_id, event_type, country_code, referrer]
  );

  // Notifier le propriétaire par email lors d'un clic WhatsApp
  if (event_type === "whatsapp_click") {
    try {
      const { query: dbQuery } = require("../config/db");
      const { sendWhatsAppNotification } = require("../services/email");
      const { rows } = await dbQuery(
        `SELECT p.title, u.email FROM properties p
         JOIN users u ON u.id = p.owner_id
         WHERE p.id = $1 AND u.email IS NOT NULL`,
        [property_id]
      );
      if (rows[0]?.email) {
        await sendWhatsAppNotification(rows[0].email, {
          propertyTitle: rows[0].title,
          propertyId: property_id,
          visitorCountry: country_code,
        });
      }
    } catch (_) { /* noop */ }
  }

  res.json({ ok: true });
}

// ─── Enregistrer une recherche ───────────────────────────────────────────────
async function trackSearch(req, res) {
  const {
    session_id, query: q, city, type, transaction_type,
    min_price, max_price, results_count = 0,
  } = req.body || {};

  const user_id = req.user?.id || null;

  await query(
    `INSERT INTO search_events
       (user_id, session_id, query, city, type, transaction_type, min_price, max_price, results_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [user_id, session_id || null, q || null, city || null, type || null,
     transaction_type || null, min_price || null, max_price || null, results_count]
  );

  res.json({ ok: true });
}

// ─── Statistiques d'une annonce pour son propriétaire ────────────────────────
async function propertyStats(req, res) {
  const { id } = req.params;

  const { rows: views } = await query(
    `SELECT
       COUNT(*) FILTER (WHERE event_type = 'view')           AS total_views,
       COUNT(*) FILTER (WHERE event_type = 'whatsapp_click') AS whatsapp_clicks,
       COUNT(*) FILTER (WHERE event_type = 'contact_click')  AS contact_clicks,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS views_7d,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS views_30d,
       COUNT(DISTINCT session_id) AS unique_visitors
     FROM property_views
     WHERE property_id = $1`,
    [id]
  );

  const { rows: byDay } = await query(
    `SELECT
       TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
       COUNT(*) FILTER (WHERE event_type = 'view') AS views
     FROM property_views
     WHERE property_id = $1 AND created_at > NOW() - INTERVAL '30 days'
     GROUP BY day ORDER BY day`,
    [id]
  );

  const { rows: byCountry } = await query(
    `SELECT country_code, COUNT(*) AS cnt
     FROM property_views
     WHERE property_id = $1 AND event_type = 'view'
     GROUP BY country_code ORDER BY cnt DESC LIMIT 5`,
    [id]
  );

  res.json({
    stats: views[0],
    by_day: byDay,
    by_country: byCountry,
  });
}

// ─── Stats globales de l'annonceur ───────────────────────────────────────────
async function myStats(req, res) {
  const owner_id = req.user.id;

  const { rows } = await query(
    `SELECT
       p.id, p.title, p.city, p.status,
       p.listing_expires_at, p.price, p.currency, p.transaction_type,
       COUNT(pv.id) FILTER (WHERE pv.event_type = 'view') AS total_views,
       COUNT(pv.id) FILTER (WHERE pv.event_type = 'whatsapp_click') AS whatsapp_clicks,
       COUNT(pv.id) FILTER (WHERE pv.created_at > NOW() - INTERVAL '7 days'
                              AND pv.event_type = 'view') AS views_7d,
       COUNT(DISTINCT pv.session_id) AS unique_visitors,
       CASE
         WHEN p.listing_expires_at IS NULL THEN 'no_subscription'
         WHEN p.listing_expires_at < NOW() THEN 'expired'
         WHEN p.listing_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
         ELSE 'active'
       END AS subscription_status,
       EXTRACT(DAY FROM (p.listing_expires_at - NOW()))::int AS days_remaining
     FROM properties p
     LEFT JOIN property_views pv ON pv.property_id = p.id
     WHERE p.owner_id = $1
     GROUP BY p.id
     ORDER BY total_views DESC`,
    [owner_id]
  );

  res.json({ listings: rows });
}

// ─── Annonces similaires (content-based) ─────────────────────────────────────
async function similar(req, res) {
  const { id } = req.params;

  // Récupérer le profil de l'annonce cible
  const { rows: target } = await query(
    "SELECT type, city, country_code, transaction_type, price FROM properties WHERE id = $1",
    [id]
  );
  if (!target.length) return res.json({ items: [] });

  const p = target[0];
  const priceRange = Number(p.price) * 0.4; // ±40%

  const { rows } = await query(
    `SELECT id, type, transaction_type, title, city, country_code,
            price, currency, area_m2, bedrooms, is_furnished,
            listing_expires_at
     FROM properties
     WHERE id != $1
       AND status = 'published'
       AND (listing_expires_at IS NULL OR listing_expires_at > NOW())
       AND type = $2
       AND transaction_type = $3
       AND (
         LOWER(city) = LOWER($4)
         OR (price BETWEEN $5 AND $6)
       )
     ORDER BY
       CASE WHEN LOWER(city) = LOWER($4) THEN 0 ELSE 1 END,
       ABS(price - $7)
     LIMIT 4`,
    [id, p.type, p.transaction_type, p.city,
     Number(p.price) - priceRange, Number(p.price) + priceRange,
     Number(p.price)]
  );

  res.json({ items: rows });
}

// ─── Suggestions personnalisées (basées sur les dernières recherches) ─────────
async function suggestions(req, res) {
  const { session_id } = req.query;
  const user_id = req.user?.id || null;

  if (!session_id && !user_id) return res.json({ items: [] });

  // Récupérer les 5 dernières recherches de la session/user
  const { rows: searches } = await query(
    `SELECT city, type, transaction_type, min_price, max_price
     FROM search_events
     WHERE (session_id = $1 OR ($2::uuid IS NOT NULL AND user_id = $2))
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC
     LIMIT 5`,
    [session_id || "", user_id]
  );

  if (!searches.length) return res.json({ items: [] });

  // Construire une requête basée sur les préférences déduites
  const cities = [...new Set(searches.map((s) => s.city).filter(Boolean))];
  const types = [...new Set(searches.map((s) => s.type).filter(Boolean))];
  const txTypes = [...new Set(searches.map((s) => s.transaction_type).filter(Boolean))];

  let whereClause = `status = 'published'
    AND (listing_expires_at IS NULL OR listing_expires_at > NOW())`;
  const params = [];

  if (cities.length) {
    params.push(cities);
    whereClause += ` AND LOWER(city) = ANY(SELECT LOWER(unnest($${params.length}::text[])))`;
  }
  if (types.length) {
    params.push(types);
    whereClause += ` AND type = ANY($${params.length}::text[])`;
  }
  if (txTypes.length) {
    params.push(txTypes);
    whereClause += ` AND transaction_type = ANY($${params.length}::text[])`;
  }

  params.push(6);
  const { rows } = await query(
    `SELECT id, type, transaction_type, title, city, country_code,
            price, currency, area_m2, bedrooms, is_furnished, boosted_until
     FROM properties
     WHERE ${whereClause}
     ORDER BY boosted_until DESC NULLS LAST, published_at DESC
     LIMIT $${params.length}`,
    params
  );

  res.json({ items: rows, based_on: { cities, types, txTypes } });
}

module.exports = { trackView, trackSearch, propertyStats, myStats, similar, suggestions };
