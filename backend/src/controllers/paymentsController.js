"use strict";

const Joi = require("joi");
const Transaction = require("../models/Transaction");
const Escrow = require("../models/Escrow");
const Property = require("../models/Property");
const User = require("../models/User");
const registry = require("../services/PaymentProviderRegistry");
const { generateReceipt } = require("../services/receipt");
const { BadRequest, NotFound, Forbidden } = require("../utils/errors");
const logger = require("../utils/logger");
const config = require("../config");

const initiateSchema = Joi.object({
  provider: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().default("XOF"),
  property_id: Joi.string().uuid().allow(null),
  purpose: Joi.string().valid("deposit", "escrow", "boost", "commission", "subscription", "listing_fee").required(),
  customer_phone: Joi.string().required(),
  customer_email: Joi.string().email().allow(null, ""),
  customer_name: Joi.string().max(120).allow(null, ""),
  preferred_operator: Joi.string().valid("orange", "moov", "mtn", "wave", "card").allow(null),
  description: Joi.string().max(255).allow(null, ""),
});

async function listProviders(req, res) {
  const country = (req.query.country || "BF").toUpperCase();
  res.json({ providers: registry.listForCountry(country) });
}

async function initiate(req, res) {
  const { value, error } = initiateSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  // Frais de publication : montant fixe 2 000 FCFA/mois, pas négociable
  if (value.purpose === "listing_fee" && value.amount !== config.commissions.listingFeeXof) {
    throw BadRequest(`Frais de publication : montant attendu ${config.commissions.listingFeeXof} XOF`);
  }

  const provider = registry.get(value.provider);

  const tx = await Transaction.create({
    buyer_id: req.user.id,
    property_id: value.property_id,
    provider: provider.name,
    purpose: value.purpose,
    amount: value.amount,
    currency: value.currency,
  });

  let result;
  try {
    result = await provider.initiate({
      amount: value.amount,
      currency: value.currency,
      reference: tx.reference,
      customerPhone: value.customer_phone,
      customerEmail: value.customer_email || req.user?.email,
      customerName: value.customer_name || req.user?.name,
      preferredOperator: value.preferred_operator,
      description: value.description || "Frais de publication ImmoBF",
      metadata: { transaction_id: tx.id, purpose: value.purpose },
    });
  } catch (e) {
    await Transaction.updateStatus(tx.id, "failed", { raw_payload: e.raw || { message: e.message } });
    await Transaction.logEvent(tx.id, "initiate_failed", { message: e.message, raw: e.raw });
    throw e;
  }

  const finalStatus = result.status || "pending";
  await Transaction.updateStatus(tx.id, finalStatus, {
    external_id: result.external_id,
    raw_payload: result.raw,
    payment_url: result.payment_url,
  });
  await Transaction.logEvent(tx.id, "initiate", result);

  // Stub mode : succès immédiat — déclencher les effets post-paiement inline
  if (finalStatus === "succeeded") {
    if (value.purpose === "listing_fee" && value.property_id) {
      try {
        await Property.markListingFeePaid(value.property_id);
        await Property.setExpiry(value.property_id, 30);
        logger.info({ property_id: value.property_id }, "stub: listing_fee succeeded");
      } catch (e) {
        logger.warn({ err: e.message }, "stub: markListingFeePaid failed");
      }
    }
  }

  res.status(201).json({
    transaction_id: tx.id,
    reference: tx.reference,
    provider: provider.name,
    status: finalStatus,
    payment_url: result.payment_url || null,
    ussd_code: result.ussd_code || null,
  });
}

async function webhook(req, res) {
  const providerName = req.params.provider;
  const provider = registry.get(providerName);

  if (!provider.verifyWebhookSignature(req.headers, req.rawBody || "")) {
    logger.warn({ provider: providerName }, "Webhook signature invalid");
    return res.status(401).json({ ok: false });
  }

  const parsed = provider.parseWebhook(req.body);
  if (!parsed.reference) {
    logger.warn({ provider: providerName, body: req.body }, "Webhook missing reference");
    return res.status(400).json({ ok: false });
  }

  const tx = await Transaction.findByReference(parsed.reference);
  if (!tx) {
    logger.warn({ reference: parsed.reference }, "Webhook for unknown transaction");
    return res.status(404).json({ ok: false });
  }

  await Transaction.logEvent(tx.id, "webhook", parsed.raw);

  if (tx.status === "succeeded") {
    return res.json({ ok: true, already_processed: true });
  }

  const updated = await Transaction.updateStatus(tx.id, parsed.status, {
    external_id: parsed.external_id,
    raw_payload: parsed.raw,
  });

  if (parsed.status === "succeeded") {
    // --- Frais de publication → auto-publier l'annonce ---
    if (tx.purpose === "listing_fee" && tx.property_id) {
      try {
        await Property.markListingFeePaid(tx.property_id);
        await Property.setExpiry(tx.property_id, 30);
        logger.info({ property_id: tx.property_id }, "listing_fee paid — annonce publiée + expiry 30j");
      } catch (e) {
        logger.error({ err: e.message, property_id: tx.property_id }, "markListingFeePaid failed");
      }
    }

    // --- Escrow / dépôt de garantie ---
    if (tx.purpose === "escrow" || tx.purpose === "deposit") {
      const dueAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await Escrow.create(tx.id, dueAt);
    }

    // --- Boost ---
    if (tx.purpose === "boost" && tx.property_id) {
      await Property.boost(tx.property_id, updated.buyer_id, 7);
    }

    // --- Reçu ---
    try {
      const buyer = await User.findById(updated.buyer_id);
      const property = updated.property_id ? await Property.findById(updated.property_id) : null;
      await generateReceipt(updated, { buyer, property });
    } catch (e) {
      logger.warn({ err: e.message }, "Receipt generation failed");
    }
  }

  res.json({ ok: true });
}

async function get(req, res) {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) throw NotFound();
  if (tx.buyer_id !== req.user.id && req.user.role !== "admin") throw Forbidden();
  res.json({ transaction: tx });
}

async function listMine(req, res) {
  const items = await Transaction.listForUser(req.user.id);
  res.json({ items });
}

async function releaseEscrow(req, res) {
  if (!["admin", "agent"].includes(req.user.role)) throw Forbidden();
  const tx = await Transaction.findById(req.params.id);
  if (!tx) throw NotFound();
  const esc = await Escrow.findByTransaction(tx.id);
  if (!esc) throw NotFound("Escrow introuvable");
  const released = await Escrow.release(esc.id, req.body.notes || null);
  res.json({ escrow: released });
}

async function mockSucceed(req, res) {
  if (config.env === "production") throw Forbidden();
  const tx = await Transaction.findByReference(req.params.reference);
  if (!tx) throw NotFound();
  const updated = await Transaction.updateStatus(tx.id, "succeeded", { raw_payload: { mock: true } });
  await Transaction.logEvent(tx.id, "webhook", { mock: true });

  // Déclencher les effets du webhook en mode mock
  if (tx.purpose === "listing_fee" && tx.property_id) {
    await Property.markListingFeePaid(tx.property_id);
    await Property.setExpiry(tx.property_id, 30);
  }
  if (tx.purpose === "boost" && tx.property_id) {
    await Property.boost(tx.property_id, updated.buyer_id, 7);
  }

  res.json({ ok: true, transaction: updated });
}

module.exports = { listProviders, initiate, webhook, get, listMine, releaseEscrow, mockSucceed };
