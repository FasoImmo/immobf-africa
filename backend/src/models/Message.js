"use strict";

const { query } = require("../config/db");

async function listForConversation(conversationId) {
  const { rows } = await query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.body, m.read_at, m.created_at,
            u.full_name AS sender_name
     FROM messages m
     JOIN users u ON u.id = m.sender_id
     WHERE m.conversation_id = $1
     ORDER BY m.created_at ASC`,
    [conversationId]
  );
  return rows;
}

async function create(conversationId, senderId, body) {
  const { rows } = await query(
    `INSERT INTO messages (conversation_id, sender_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [conversationId, senderId, body]
  );
  return rows[0];
}

/**
 * Marque tous les messages non-lus de cette conversation
 * dont l'expéditeur n'est PAS l'utilisateur courant.
 */
async function markAllRead(conversationId, readerUserId) {
  await query(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = $1
       AND sender_id <> $2
       AND read_at IS NULL`,
    [conversationId, readerUserId]
  );
}

module.exports = { listForConversation, create, markAllRead };
