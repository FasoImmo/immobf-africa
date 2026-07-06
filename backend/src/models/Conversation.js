"use strict";

const { query } = require("../config/db");

/**
 * Crée ou récupère une conversation entre buyer et seller pour une annonce.
 * Un seul fil par (property_id, buyer_id).
 */
async function findOrCreate(propertyId, buyerId, sellerId) {
  const { rows } = await query(
    `INSERT INTO conversations (property_id, buyer_id, seller_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (property_id, buyer_id) DO UPDATE SET id = conversations.id
     RETURNING *`,
    [propertyId, buyerId, sellerId]
  );
  return rows[0];
}

/**
 * Liste toutes les conversations de l'utilisateur (acheteur ou vendeur),
 * avec le dernier message et le nombre de non-lus.
 */
async function listForUser(userId) {
  const { rows } = await query(
    `SELECT
       c.id,
       c.property_id,
       c.buyer_id,
       c.seller_id,
       c.created_at,
       p.title         AS property_title,
       p.city          AS property_city,
       (SELECT photo_url FROM property_photos pp
        WHERE pp.property_id = c.property_id
        ORDER BY pp.position ASC LIMIT 1) AS property_photo,
       ub.full_name    AS buyer_name,
       us.full_name    AS seller_name,
       last_msg.body   AS last_message,
       last_msg.created_at AS last_message_at,
       COALESCE(unread.count, 0)::int AS unread_count
     FROM conversations c
     JOIN properties p ON p.id = c.property_id
     JOIN users ub     ON ub.id = c.buyer_id
     JOIN users us     ON us.id = c.seller_id
     LEFT JOIN LATERAL (
       SELECT body, created_at FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC LIMIT 1
     ) last_msg ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS count FROM messages
       WHERE conversation_id = c.id
         AND sender_id <> $1
         AND read_at IS NULL
     ) unread ON true
     WHERE c.buyer_id = $1 OR c.seller_id = $1
     ORDER BY COALESCE(last_msg.created_at, c.created_at) DESC`,
    [userId]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT c.*, p.title AS property_title, p.owner_id AS seller_id_check
     FROM conversations c
     JOIN properties p ON p.id = c.property_id
     WHERE c.id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Nombre total de messages non-lus pour un utilisateur (badge navbar).
 */
async function unreadCount(userId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total
     FROM messages m
     JOIN conversations c ON c.id = m.conversation_id
     WHERE (c.buyer_id = $1 OR c.seller_id = $1)
       AND m.sender_id <> $1
       AND m.read_at IS NULL`,
    [userId]
  );
  return parseInt(rows[0]?.total || 0, 10);
}

module.exports = { findOrCreate, listForUser, findById, unreadCount };
