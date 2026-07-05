"use strict";

const Joi = require("joi");
const Transaction = require("../models/Transaction");
const Booking     = require("../models/Booking");
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
  // Code OTP que le client génère lui-même via le service USSD Orange Money
  // (avec son code secret) avant l'appel — requis uniquement quand
  // provider = "pawapay" ET preferred_operator = "orange" (flux PREAUTH,
  // voir PawaPayProvider.js).
  pawapay_otp: Joi.string().alphanum().max(36).allow(null, ""),
  description: Joi.string().max(255).allow(null, ""),
  // Durée souhaitée par le client pour une réservation (nuits/semaines/mois
  // selon rent_period de l'annonce) — sert à calculer la commission sur le
  // montant total du séjour/loyer, pas seulement sur le prix unitaire.
  booking_units: Joi.number().integer().min(1).max(365).default(1),
  check_in: Joi.date().iso().allow(null, ""),
});

async function listProviders(req, res) {
  const country = (req.query.country || "BF").toUpperCase();
  res.json({ providers: registry.listForCountry(country) });
}

async function initiate(req, res) {
  const { value, error } = initiateSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  // Guest (non-authentifié) : email obligatoire pour envoyer le reçu
  if (!req.user && !value.customer_email) {
    throw BadRequest("Votre email est requis pour recevoir le reçu de paiement.");
  }

  // Frais de publication : montant doit correspondre à un plan valide
  if (value.purpose === "listing_fee") {
    const validAmounts = Object.values(config.commissions.listingPlans);
    if (!validAmounts.includes(value.amount)) {
      throw BadRequest(`Montant invalide. Plans disponibles (FCFA) : ${validAmounts.join(", ")}`);
    }
  }

  // Commission de réservation : le client paie le bien DIRECTEMENT au
  // propriétaire (mobile money, hors plateforme). Seule la commission ImmoBF
  // (% configurable, cf. config.commissions.appPct) transite ici. Le montant
  // est toujours recalculé côté serveur à partir du prix réel de l'annonce ET
  // de la durée demandée (booking_units : nuits/semaines/mois selon
  // rent_period) — on ignore le montant envoyé par le client pour éviter
  // qu'il soit minoré.
  let property = null;
  let totalBookingAmount = null;
  if (value.purpose === "commission" && value.property_id) {
    property = await Property.findById(value.property_id);
    if (!property) throw BadRequest("Annonce introuvable");
    totalBookingAmount = property.price * value.booking_units;
    value.amount = Math.max(100, Math.round(totalBookingAmount * config.commissions.appPct / 100));
    value.currency = property.currency || value.currency;
  }

  const provider = registry.get(value.provider);

  const tx = await Transaction.create({
    buyer_id: req.user?.id || null,
    property_id: value.property_id,
    provider: provider.name,
    purpose: value.purpose,
    amount: value.amount,
    currency: value.currency,
    // CORRECTIF (30/06/2026) : on garde l'email saisi à la caisse pour pouvoir
    // y envoyer le reçu même si le compte n'a pas d'email enregistré, ou si
    // le client préfère recevoir le reçu à une autre adresse.
    customer_email: value.customer_email || null,
  });

  // Upsert CRM contact (invité ou connecté) — non-bloquant
  if (value.customer_email) {
    const Contact = require("../models/Contact");
    Contact.upsert({
      user_id:  req.user?.id || null,
      email:    value.customer_email,
      phone:    value.customer_phone || null,
      country:  property?.country_code || null,
    }).catch((e) => logger.warn({ err: e.message }, "contact upsert failed"));
  }

  // Trace la durée/montant total du séjour demandée (hors colonnes dédiées —
  // évite une migration de schéma) pour pouvoir la restituer dans la copie de
  // facture envoyée à l'annonceur.
  if (totalBookingAmount !== null) {
    await Transaction.logEvent(tx.id, "booking_details", {
      booking_units: value.booking_units,
      rent_period: property?.rent_period || null,
      check_in: value.check_in || null,
      total_booking_amount: totalBookingAmount,
    });
  }

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
      metadata: {
        transaction_id: tx.id,
        purpose: value.purpose,
        // operator/preAuthorisationCode : utilisés par PawaPayProvider pour
        // choisir MOOV_BFA/ORANGE_BFA et transmettre le code OTP Orange.
        operator: value.preferred_operator,
        preAuthorisationCode: value.pawapay_otp || undefined,
      },
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
        // Déterminer la durée en jours selon le plan choisi
        const plans = config.commissions.listingPlans;
        const months = Object.entries(plans).find(([, v]) => v === value.amount)?.[0] || 1;
        const days = Number(months) * 30;
        await Property.markListingFeePaid(value.property_id);
        await Property.setExpiry(value.property_id, days);
        logger.info({ property_id: value.property_id, days }, "stub: listing_fee succeeded");
      } catch (e) {
        logger.warn({ err: e.message }, "stub: markListingFeePaid failed");
      }
    }

    // CORRECTIF (30/06/2026) : le mode stub (succès immédiat, sans webhook)
    // ne déclenchait aucun reçu — l'UI affichait pourtant déjà "reçu envoyé
    // par email" dans ce cas, ce qui était faux à 100%.
    try {
      // On envoie le reçu à l'email saisi à la caisse (customer_email) ou, à
      // défaut, à l'email du compte connecté. Cela couvre le flux mobile où
      // customer_email n'est pas envoyé : l'annonceur reçoit quand même sa facture.
      const recipientEmail = tx.customer_email || req.user?.email;
      if (recipientEmail) {
        const { sendPaymentReceipt } = require("../services/email");
        const plans = config.commissions.listingPlans;
        const months = Object.entries(plans).find(([, v]) => v === value.amount)?.[0] || 1;
        // Fire-and-forget : on ne bloque pas la réponse HTTP sur l'API Resend
        sendPaymentReceipt(recipientEmail, {
          amount: value.amount,
          currency: value.currency,
          reference: tx.reference,
          purpose: value.purpose,
          propertyTitle: property?.title,
          months: Number(months),
        }).catch((e) => logger.warn({ err: e.message }, "stub: receipt email failed"));
      } else {
        logger.info({ transaction_id: tx.id, purpose: value.purpose }, "stub: pas d'email reçu (mobile commission ou email absent)");
      }

      // Créer la réservation calendrier pour les courts séjours (stub)
      if (value.purpose === "commission" && value.property_id && value.check_in && value.booking_units) {
        try {
          const checkIn  = new Date(value.check_in);
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + Number(value.booking_units));
          await Booking.create(value.property_id, tx.id, checkIn, checkOut);
          logger.info({ property_id: value.property_id, check_in: value.check_in, nights: value.booking_units }, "stub: booking créé");
        } catch (e) {
          logger.warn({ err: e.message }, "stub: booking creation failed");
        }
      }
    } catch (e) {
      logger.warn({ err: e.message }, "stub: post-payment hook failed");
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

  // Certains fournisseurs (FedaPay notamment) n'échouent PAS à renvoyer notre
  // métadonnée `reference` dans le webhook — ils remplacent `entity.metadata`
  // par leurs propres données internes (ex. "expire_schedule_jobid") et ne
  // laissent que leur propre `entity.reference` (ex. "trx_GH0_..."), différent
  // de notre référence "IMO-...". Dans ce cas `parsed.reference` ne correspond
  // à aucune transaction chez nous — on retombe alors sur une recherche par
  // `external_id` (l'ID de transaction du fournisseur, lui bien fiable et
  // déjà enregistré lors de l'initiation du paiement).
  let tx = await Transaction.findByReference(parsed.reference);
  if (!tx && parsed.external_id) {
    tx = await Transaction.findByExternalId(providerName, parsed.external_id);
  }
  if (!tx) {
    logger.warn(
      { reference: parsed.reference, external_id: parsed.external_id, provider: providerName },
      "Webhook for unknown transaction"
    );
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
        const plans = config.commissions.listingPlans;
        const months = Object.entries(plans).find(([, v]) => v === Number(tx.amount))?.[0] || 1;
        const days = Number(months) * 30;
        await Property.markListingFeePaid(tx.property_id);
        await Property.setExpiry(tx.property_id, days);
        logger.info({ property_id: tx.property_id, days }, "listing_fee paid — annonce publiée");
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

    // --- Reçu PDF + Email ---
    try {
      const buyer = await User.findById(updated.buyer_id);
      const property = updated.property_id ? await Property.findById(updated.property_id) : null;
      await generateReceipt(updated, { buyer, property });
      // CORRECTIF (30/06/2026) : priorité à l'email saisi à la caisse
      // (tx.customer_email) — sinon repli sur l'email du compte. Avant ce
      // correctif, seul buyer.email était utilisé : si le compte n'avait pas
      // d'email (créé avant que l'email soit obligatoire), aucun reçu ne
      // partait, sans que personne ne le sache.
      const receiptEmail = tx.customer_email || buyer?.email;
      if (receiptEmail) {
        const { sendPaymentReceipt } = require("../services/email");
        const plans = config.commissions.listingPlans;
        const months = Object.entries(plans).find(([, v]) => v === Number(updated.amount))?.[0] || 1;
        await sendPaymentReceipt(receiptEmail, {
          amount: updated.amount,
          currency: updated.currency,
          reference: updated.reference,
          purpose: updated.purpose,
          propertyTitle: property?.title,
          months: Number(months),
        });
      } else {
        logger.warn({ transaction_id: updated.id }, "Aucun email destinataire pour le reçu (ni caisse ni compte)");
      }

      // --- Copie facture à l'annonceur (commission de réservation) ---
      // L'annonceur doit recevoir, en même temps que le client, une copie de
      // la facture de la commission ImmoBF perçue sur sa réservation.
      if (updated.purpose === "commission" && property?.owner_id) {
        try {
          const owner = await User.findById(property.owner_id);
          if (owner?.email) {
            const { sendOwnerCommissionReceipt } = require("../services/email");
            const PERIOD_LABEL = { monthly: "mois", weekly: "semaine(s)", nightly: "nuit(s)" };
            const details = await Transaction.findLatestEvent(updated.id, "booking_details");
            await sendOwnerCommissionReceipt(owner.email, {
              amount: updated.amount,
              currency: updated.currency,
              reference: updated.reference,
              propertyTitle: property.title,
              buyerPhone: buyer?.phone,
              units: details?.booking_units,
              periodLabel: PERIOD_LABEL[details?.rent_period] || "",
              totalAmount: details?.total_booking_amount,
            });
          }
        } catch (e) {
          logger.warn({ err: e.message }, "Owner commission receipt copy failed");
        }
      }

      // --- Créer la réservation calendrier (court séjour, webhook) ---
      if (updated.purpose === "commission" && updated.property_id) {
        try {
          const details = await Transaction.findLatestEvent(updated.id, "booking_details");
          if (details?.check_in && details?.booking_units) {
            const checkIn  = new Date(details.check_in);
            const checkOut = new Date(checkIn);
            checkOut.setDate(checkOut.getDate() + Number(details.booking_units));
            await Booking.create(updated.property_id, updated.id, checkIn, checkOut);
            logger.info({ property_id: updated.property_id, check_in: details.check_in }, "webhook: booking créé");
          }
        } catch (e) {
          logger.warn({ err: e.message }, "webhook: booking creation failed");
        }
      }
    } catch (e) {
      logger.warn({ err: e.message }, "Receipt generation failed");
    }
  }

  res.json({ ok: true });
}

async function get(req, res) {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) throw NotFound();
  // Authenticated user: must own the transaction (or be admin)
  if (req.user) {
    if (tx.buyer_id !== req.user.id && req.user.role !== "admin") throw Forbidden();
  } else {
    // Guest: only allowed to poll guest transactions (buyer_id = null)
    // Transaction ID is a UUID — guessing is infeasible in practice
    if (tx.buyer_id !== null) throw Forbidden();
  }
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

/**
 * DIAGNOSTIC TEMPORAIRE (29/06/2026) — débogage de l'absence de callback
 * PawaPay : la console Railway s'est révélée difficile à utiliser pour
 * lancer une requête SQL/HTTP manuelle, donc on expose deux routes admin
 * pour (1) lister les dernières transactions PawaPay et (2) demander à
 * PawaPay de renvoyer le callback d'un dépôt précis. À retirer une fois
 * le problème de callback résolu et confirmé stable.
 */
async function adminPawapayLast(req, res) {
  if (req.user.role !== "admin") throw Forbidden();
  const { query } = require("../config/db");
  const { rows } = await query(
    `SELECT id, reference, external_id, status, amount, currency, created_at, updated_at
     FROM transactions WHERE provider = 'pawapay' ORDER BY created_at DESC LIMIT 5`
  );
  res.json({ transactions: rows });
}

async function adminPawapayResendCallback(req, res) {
  if (req.user.role !== "admin") throw Forbidden();
  const depositId = req.params.depositId;
  const { apiToken, live } = config.providers.pawapay;
  if (!apiToken) throw new BadRequest("PawaPay non configuré");
  const baseUrl = live ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
  const r = await fetch(`${baseUrl}/v2/deposits/resend-callback/${depositId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const body = await r.json().catch(() => ({}));
  res.status(r.status).json(body);
}

module.exports = {
  listProviders, initiate, webhook, get, listMine, releaseEscrow, mockSucceed,
  adminPawapayLast, adminPawapayResendCallback,
};
