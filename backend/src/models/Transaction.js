"use strict";

const { query } = require("../config/db");
const { v4: uuidv4 } = require("uuid");

async function create({
  buyer_id = null, property_id = null, agency_id = null,
  provider, purpose, amount, currency = "XOF",
  reference = null, payment_url = null, ussd_code = null,
  customer_email = null, customer_name = null,
}) {
  const ref = reference || `IMO-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
  const { rows } = await query(
    `INSERT INTO transactions
      (buyer_id, property_id, agency_id, provider, purpose, amount, currency,
       reference, payment_url, ussd_code, customer_email, customer_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [buyer_id, property_id, agency_id, provider, purpose, amount, currency, ref, payment_url, ussd_code, customer_email, customer_name]
  );
  return rows[0];
}

async function findByReference(reference) {
  const { rows } = await query(`SELECT * FROM transactions WHERE reference = $1`, [reference]);
  return rows[0] || null;
}

async function findByExternalId(provider, external_id) {
  const { rows } = await query(
    `SELECT * FROM transactions WHERE provider = $1 AND external_id = $2`,
    [provider, external_id]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await query(`SELECT * FROM transactions WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function updateStatus(id, status, { external_id = null, raw_payload = null, payment_url = null } = {}) {
  const { rows } = await query(
    `UPDATE transactions
     SET status = $2,
         external_id = COALESCE($3, external_id),
         payment_url = COALESCE($5, payment_url),
         raw_payload = COALESCE($4::jsonb, raw_payload),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, external_id, raw_payload ? JSON.stringify(raw_payload) : null, payment_url]
  );
  return rows[0] || null;
}

async function logEvent(transaction_id, kind, payload) {
  await query(
    `INSERT INTO payment_events (transaction_id, kind, payload) VALUES ($1,$2,$3::jsonb)`,
    [transaction_id, kind, JSON.stringify(payload)]
  );
}

async function findLatestEvent(transaction_id, kind) {
  const { rows } = await query(
    `SELECT payload FROM payment_events
     WHERE transaction_id = $1 AND kind = $2
     ORDER BY created_at DESC LIMIT 1`,
    [transaction_id, kind]
  );
  return rows[0]?.payload || null;
}

async function listForUser(user_id, { limit = 20, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT * FROM transactions WHERE buyer_id = $1
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    [user_id, limit, offset]
  );
  return rows;
}

/**
 * Toutes les transactions (admin) — avec nom/email/téléphone de l'acheteur
 * et titre de l'annonce associée. Utilisé pour le suivi global des revenus.
 */
async function listAllForAdmin({ limit = 200, offset = 0 } = {}) {
  const { rows } = await query(
    `SELECT t.*,
            u.full_name  AS buyer_name,
            u.phone      AS buyer_phone,
            u.email      AS buyer_email,
            p.title      AS property_title,
            p.country_code AS property_country
     FROM transactions t
     LEFT JOIN users       u ON u.id = t.buyer_id
     LEFT JOIN properties  p ON p.id = t.property_id
     ORDER BY t.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

/**
 * Synthèse par annonceur (vendeur) : total des frais payés à ImmoBF
 * (transactions succeeded de type listing_fee), nombre d'annonces publiées,
 * pays principal (mode), et date du dernier paiement.
 *
 * Un "annonceur fidèle" est quelqu'un qui revient régulièrement payer des
 * frais de publication — visible via nb_transactions et last_payment_at.
 */
async function revenuesByUser() {
  const { rows } = await query(`
    SELECT
      u.id,
      u.full_name,
      u.phone,
      u.email,
      u.role,
      COUNT(DISTINCT p.id)                                          AS nb_annonces,
      COUNT(t.id) FILTER (WHERE t.status = 'succeeded')            AS nb_transactions,
      COALESCE(
        SUM(t.amount) FILTER (WHERE t.status = 'succeeded'), 0
      )::int                                                        AS total_paid,
      MAX(t.created_at)                                            AS last_payment_at,
      -- pays le plus fréquent parmi les annonces publiées par cet utilisateur
      (
        SELECT p2.country_code
        FROM properties p2
        WHERE p2.owner_id = u.id
        GROUP BY p2.country_code
        ORDER BY COUNT(*) DESC
        LIMIT 1
      )                                                             AS main_country
    FROM users u
    LEFT JOIN transactions t ON t.buyer_id = u.id
    LEFT JOIN properties   p ON p.owner_id = u.id
    GROUP BY u.id
    HAVING COUNT(t.id) > 0 OR COUNT(DISTINCT p.id) > 0
    ORDER BY total_paid DESC, nb_annonces DESC
  `);
  return rows;
}

/**
 * KPIs globaux pour le tableau de bord admin : CA total ImmoBF, répartition
 * par type de transaction (listing_fee vs commission), et nombre
 * d'annonceurs distincts ayant payé au moins une fois.
 */
async function globalRevenueStats() {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)::int            AS total_revenue,
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded' AND purpose = 'listing_fee'), 0)::int   AS revenue_listing,
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded' AND purpose = 'commission'), 0)::int    AS revenue_commission,
      COUNT(*)  FILTER (WHERE status = 'succeeded')                                  AS nb_succeeded,
      COUNT(*)  FILTER (WHERE status = 'pending')                                    AS nb_pending,
      COUNT(*)  FILTER (WHERE status = 'failed')                                     AS nb_failed,
      COUNT(DISTINCT buyer_id) FILTER (WHERE status = 'succeeded')                   AS nb_annonceurs_actifs
    FROM transactions
  `);
  return rows[0];
}

/**
 * KPIs par période : total CA, succeeded/failed/pending, CA listing_fee vs commission.
 * startDate et endDate sont des strings ISO 'YYYY-MM-DD' ou null (= tout).
 */
async function statsByPeriod(startDate, endDate) {
  const { rows } = await query(`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)::int          AS total_revenue,
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded' AND purpose = 'listing_fee'), 0)::int  AS revenue_listing,
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded' AND purpose = 'commission'), 0)::int   AS revenue_commission,
      COUNT(*) FILTER (WHERE status = 'succeeded')                                AS nb_succeeded,
      COUNT(*) FILTER (WHERE status = 'failed')                                   AS nb_failed,
      COUNT(*) FILTER (WHERE status = 'pending')                                  AS nb_pending,
      COUNT(*) FILTER (WHERE status IN ('refunded','cancelled'))                  AS nb_cancelled,
      COUNT(*)                                                                     AS nb_total,
      COUNT(DISTINCT buyer_id) FILTER (WHERE status = 'succeeded')                AS nb_annonceurs_actifs
    FROM transactions
    WHERE ($1::date IS NULL OR created_at >= $1::date)
      AND ($2::date IS NULL OR created_at < ($2::date::date + INTERVAL '1 day'))
  `, [startDate || null, endDate || null]);
  return rows[0];
}

/**
 * Répartition par provider de paiement sur la période donnée.
 * Retourne une ligne par provider : nb_succeeded, nb_failed, total_revenue.
 */
async function statsByProvider(startDate, endDate) {
  const { rows } = await query(`
    SELECT
      provider,
      COUNT(*) FILTER (WHERE status = 'succeeded')                              AS nb_succeeded,
      COUNT(*) FILTER (WHERE status = 'failed')                                 AS nb_failed,
      COUNT(*) FILTER (WHERE status = 'pending')                                AS nb_pending,
      COUNT(*)                                                                   AS nb_total,
      COALESCE(SUM(amount) FILTER (WHERE status = 'succeeded'), 0)::int         AS total_revenue
    FROM transactions
    WHERE ($1::date IS NULL OR created_at >= $1::date)
      AND ($2::date IS NULL OR created_at < ($2::date::date + INTERVAL '1 day'))
    GROUP BY provider
    ORDER BY total_revenue DESC
  `, [startDate || null, endDate || null]);
  return rows;
}

/**
 * Transactions détaillées d'un annonceur spécifique (panneau admin).
 * Inclut le provider/opérateur, la référence, le titre de l'annonce liée.
 */
async function listForUserAdmin(userId) {
  const { rows } = await query(
    `SELECT t.id, t.reference, t.amount, t.currency, t.provider, t.purpose,
            t.status, t.created_at,
            p.title AS property_title
     FROM transactions t
     LEFT JOIN properties p ON p.id = t.property_id
     WHERE t.buyer_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );
  return rows;
}

/**
 * Stats d'interactions sur les propriétés d'un annonceur (vues, clics WhatsApp).
 */
async function interactionStatsByUser(userId) {
  const { rows } = await query(
    `SELECT p.id, p.title, p.status, p.country_code, p.city,
            COALESCE(SUM(e.count) FILTER (WHERE e.event_type = 'view'), 0)::int        AS total_views,
            COALESCE(SUM(e.count) FILTER (WHERE e.event_type = 'whatsapp_click'), 0)::int AS whatsapp_clicks
     FROM properties p
     LEFT JOIN (
       SELECT property_id, event_type, COUNT(*) AS count
       FROM property_views
       GROUP BY property_id, event_type
     ) e ON e.property_id = p.id
     WHERE p.owner_id = $1
     GROUP BY p.id
     ORDER BY total_views DESC`,
    [userId]
  );
  return rows;
}

/**
 * Liste filtrée des transactions pour l'onglet admin dédié.
 * Tous les paramètres sont optionnels.
 */
async function listFiltered({
  date_from, date_to,
  search,          // full_name, email, phone, customer_email
  country,         // country_code de la propriété
  purpose,         // listing_fee | commission | ...
  provider,
  status,
  min_amount, max_amount,
  limit = 100, offset = 0,
} = {}) {
  const params = [];
  const where  = [];

  if (date_from) { params.push(date_from); where.push(`t.created_at >= $${params.length}`); }
  if (date_to)   { params.push(date_to);   where.push(`t.created_at <  $${params.length}::date + INTERVAL '1 day'`); }
  if (search) {
    params.push(`%${search}%`);
    const n = params.length;
    where.push(`(u.full_name ILIKE $${n} OR u.email ILIKE $${n} OR u.phone ILIKE $${n} OR t.customer_email ILIKE $${n})`);
  }
  if (country)    { params.push(country);    where.push(`p.country_code = $${params.length}`); }
  if (purpose)    { params.push(purpose);    where.push(`t.purpose = $${params.length}`); }
  if (provider)   { params.push(provider);   where.push(`t.provider = $${params.length}`); }
  if (status)     { params.push(status);     where.push(`t.status = $${params.length}`); }
  if (min_amount) { params.push(min_amount); where.push(`t.amount >= $${params.length}`); }
  if (max_amount) { params.push(max_amount); where.push(`t.amount <= $${params.length}`); }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // total count for pagination
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total
     FROM transactions t
     LEFT JOIN users      u ON u.id = t.buyer_id
     LEFT JOIN properties p ON p.id = t.property_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRows[0].total, 10);

  params.push(limit);
  params.push(offset);

  const { rows } = await query(
    `SELECT t.id, t.created_at, t.purpose, t.provider, t.amount, t.currency,
            t.status, t.reference, t.customer_email,
            u.full_name  AS buyer_name,
            u.phone      AS buyer_phone,
            u.email      AS buyer_email,
            p.title      AS property_title,
            p.country_code AS property_country
     FROM transactions t
     LEFT JOIN users      u ON u.id = t.buyer_id
     LEFT JOIN properties p ON p.id = t.property_id
     ${whereClause}
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return { rows, total };
}

module.exports = {
  create, findByReference, findByExternalId, findById, updateStatus,
  logEvent, findLatestEvent, listForUser,
  listAllForAdmin, revenuesByUser, globalRevenueStats,
  statsByPeriod, statsByProvider, listForUserAdmin, interactionStatsByUser,
  listFiltered,
};
