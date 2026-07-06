"use strict";

const Conversation = require("../models/Conversation");
const Message      = require("../models/Message");
const Property     = require("../models/Property");
const User         = require("../models/User");
const { BadRequest, NotFound, Forbidden } = require("../utils/errors");
const { sendMessageNotification } = require("../services/email");
const logger = require("../utils/logger");

/**
 * POST /conversations
 * Body: { property_id }
 * Démarre (ou récupère) une conversation acheteur → annonce.
 * L'annonceur de l'annonce devient seller_id.
 */
async function startConversation(req, res) {
  const { property_id } = req.body || {};
  if (!property_id) throw BadRequest("property_id requis");

  const prop = await Property.findById(property_id);
  if (!prop) throw NotFound("Annonce introuvable");
  if (prop.owner_id === req.user.id) throw BadRequest("Vous ne pouvez pas vous envoyer un message");

  const conv = await Conversation.findOrCreate(property_id, req.user.id, prop.owner_id);
  res.status(201).json({ conversation: conv });
}

/**
 * GET /conversations
 * Liste toutes mes conversations (acheteur ou vendeur).
 */
async function listConversations(req, res) {
  const list = await Conversation.listForUser(req.user.id);
  res.json({ conversations: list });
}

/**
 * GET /conversations/unread
 * Nombre de messages non-lus pour le badge navbar.
 */
async function unreadCount(req, res) {
  const count = await Conversation.unreadCount(req.user.id);
  res.json({ unread: count });
}

/**
 * GET /conversations/:id/messages
 * Retourne les messages et marque les non-lus comme lus.
 */
async function getMessages(req, res) {
  const conv = await Conversation.findById(req.params.id);
  if (!conv) throw NotFound("Conversation introuvable");
  if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
    throw Forbidden("Accès non autorisé");
  }

  const messages = await Message.listForConversation(conv.id);
  // Marquer les messages reçus (pas envoyés par moi) comme lus
  await Message.markAllRead(conv.id, req.user.id);

  res.json({ conversation: conv, messages });
}

/**
 * POST /conversations/:id/messages
 * Body: { body }
 * Envoie un message dans la conversation.
 */
async function sendMessage(req, res) {
  const { body } = req.body || {};
  if (!body || !body.trim()) throw BadRequest("Le message ne peut pas être vide");
  if (body.length > 2000) throw BadRequest("Message trop long (max 2000 caractères)");

  const conv = await Conversation.findById(req.params.id);
  if (!conv) throw NotFound("Conversation introuvable");
  if (conv.buyer_id !== req.user.id && conv.seller_id !== req.user.id) {
    throw Forbidden("Accès non autorisé");
  }

  const msg = await Message.create(conv.id, req.user.id, body.trim());

  // Notifier le destinataire par email (fire & forget)
  const recipientId = req.user.id === conv.buyer_id ? conv.seller_id : conv.buyer_id;
  setImmediate(async () => {
    try {
      const recipient = await User.findById(recipientId);
      if (recipient?.email) {
        await sendMessageNotification(recipient.email, {
          senderName: req.user.full_name || "Un utilisateur",
          propertyTitle: conv.property_title || "une annonce",
          conversationId: conv.id,
          preview: body.trim().slice(0, 200),
        });
      }
    } catch (err) {
      logger.error({ err }, "sendMessageNotification failed");
    }
  });

  res.status(201).json({ message: msg });
}

module.exports = { startConversation, listConversations, unreadCount, getMessages, sendMessage };
