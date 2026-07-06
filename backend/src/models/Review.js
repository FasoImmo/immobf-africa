"use strict";

const { query } = require("../config/db");

const Review = {
  /**
   * Créer ou mettre à jour un avis (upsert).
   * Un seul avis par acheteur par annonce — ON CONFLICT met à jour.
   */
  async upsert(propertyId, reviewerId, sellerId, { rating, comment }) {
    const { rows } = await query(
      `INSERT INTO reviews (property_id, reviewer_id, seller_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (property_id, reviewer_id) DO UPDATE
         SET rating = EXCLUDED.rating,
             comment = EXCLUDED.comment,
             created_at = NOW()
       RETURNING *`,
      [propertyId, reviewerId, sellerId, rating, comment || null]
    );
    return rows[0];
  },

  /** Avis existant d'un reviewer sur une annonce (pour pré-remplir le formulaire). */
  async findByPropertyAndReviewer(propertyId, reviewerId) {
    const { rows } = await query(
      `SELECT * FROM reviews WHERE property_id = $1 AND reviewer_id = $2 LIMIT 1`,
      [propertyId, reviewerId]
    );
    return rows[0] || null;
  },

  /** Liste des avis reçus par un vendeur, avec nom du reviewer. */
  async listForSeller(sellerId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await query(
      `SELECT
         r.id, r.rating, r.comment, r.created_at,
         u.full_name AS reviewer_name,
         p.title    AS property_title,
         p.id       AS property_id
       FROM reviews r
       JOIN users      u ON u.id = r.reviewer_id
       JOIN properties p ON p.id = r.property_id
       WHERE r.seller_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    );
    return rows;
  },

  /** Score moyen + nombre d'avis pour un vendeur. */
  async statsForSeller(sellerId) {
    const { rows } = await query(
      `SELECT
         ROUND(AVG(rating)::numeric, 1) AS avg_rating,
         COUNT(*)                       AS total_reviews
       FROM reviews
       WHERE seller_id = $1`,
      [sellerId]
    );
    return {
      avg_rating:    parseFloat(rows[0]?.avg_rating) || 0,
      total_reviews: parseInt(rows[0]?.total_reviews) || 0,
    };
  },
};

module.exports = Review;
