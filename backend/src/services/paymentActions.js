"use strict";

/**
 * Actions post-paiement réussi — logique partagée entre le webhook handler
 * (paymentsController.js) et le cron de réconciliation (reconciliation.js).
 *
 * Toutes les opérations sont best-effort : une erreur dans l'une d'elles
 * ne doit pas annuler les autres. Chaque bloc est wrappé dans un try/catch.
 *
 * IDEMPOTENCE : cette fonction peut être appelée plusieurs fois sur la même
 * transaction (ex. webhook + réconciliation en concurrence). Les effets sont
 * protégés :
 *   - markListingFeePaid / setExpiry : idempotents (UPDATE idempotent)
 *   - Escrow.create : si la transaction est déjà succeeded avant d'arriver ici,
 *     le webhook handler saute l'appel (guard tx.status !== "succeeded") ;
 *     la réconciliation vérifie de même.
 *   - sendPaymentReceipt : peut envoyer un 2e email si appelé 2x — acceptable
 *     (peu probable en pratique : la réconciliation n'exécute pas les actions
 *     si la transaction était déjà succeeded).
 */

const config    = require("../config");
const logger    = require("../utils/logger");
const Transaction = require("../models/Transaction");
const Booking   = require("../models/Booking");
const Escrow    = require("../models/Escrow");
const Property  = require("../models/Property");
const User      = require("../models/User");
const { generateReceipt } = require("./receipt");

async function handleSucceededPayment(tx) {
  // ── 1. Frais de publication → auto-publier l'annonce ──────────────────────
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

  // ── 2. Escrow / dépôt de garantie ─────────────────────────────────────────
  if (tx.purpose === "escrow" || tx.purpose === "deposit") {
    try {
      const dueAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);
      await Escrow.create(tx.id, dueAt);
    } catch (e) {
      logger.warn({ err: e.message, transaction_id: tx.id }, "Escrow create failed");
    }
  }

  // ── 3. Boost annonce ───────────────────────────────────────────────────────
  if (tx.purpose === "boost" && tx.property_id) {
    try {
      await Property.boost(tx.property_id, tx.buyer_id, 7);
    } catch (e) {
      logger.warn({ err: e.message }, "Boost failed");
    }
  }

  // ── 4. Reçu + emails ───────────────────────────────────────────────────────
  try {
    const buyer    = tx.buyer_id    ? await User.findById(tx.buyer_id)       : null;
    const property = tx.property_id ? await Property.findById(tx.property_id) : null;

    // Génération reçu PDF (truly best-effort — isolé pour ne pas bloquer l'email)
    // CORRECTIF : avant ce fix, si generateReceipt échouait (ex. filesystem
    // Railway, permissions, pdfkit), le catch global était déclenché et l'email
    // de reçu n'était jamais envoyé — le paiement réussissait mais l'utilisateur
    // ne recevait aucune confirmation.
    try { await generateReceipt(tx, { buyer, property }); } catch (pdfErr) {
      logger.warn({ err: pdfErr.message, transaction_id: tx.id }, "generateReceipt failed (ignoré, email envoyé quand même)");
    }

    // Reçu acheteur/annonceur
    const receiptEmail = tx.customer_email || buyer?.email;
    if (receiptEmail) {
      const { sendPaymentReceipt } = require("./email");
      const plans  = config.commissions.listingPlans;
      const months = Object.entries(plans).find(([, v]) => v === Number(tx.amount))?.[0] || 1;
      await sendPaymentReceipt(receiptEmail, {
        amount:        tx.amount,
        currency:      tx.currency,
        reference:     tx.reference,
        purpose:       tx.purpose,
        propertyTitle: property?.title,
        months:        Number(months),
        ownerWhatsapp: property?.owner_whatsapp,
        ownerPhone:    property?.owner_phone,
      });
    } else {
      logger.warn({ transaction_id: tx.id }, "Aucun email destinataire pour le reçu");
    }

    // ── 4b. Copie reçu au propriétaire (commission de réservation) ──────────
    if (tx.purpose === "commission" && property?.owner_id) {
      try {
        const owner = await User.findById(property.owner_id);
        if (owner?.email) {
          const { sendOwnerCommissionReceipt } = require("./email");
          const PERIOD_LABEL = { monthly: "mois", weekly: "semaine(s)", nightly: "nuit(s)" };
          const details = await Transaction.findLatestEvent(tx.id, "booking_details");
          await sendOwnerCommissionReceipt(owner.email, {
            amount:        tx.amount,
            currency:      tx.currency,
            reference:     tx.reference,
            propertyTitle: property.title,
            buyerPhone:    buyer?.phone,
            units:         details?.booking_units,
            periodLabel:   PERIOD_LABEL[details?.rent_period] || "",
            totalAmount:   details?.total_booking_amount,
          });
        }
      } catch (e) {
        logger.warn({ err: e.message }, "Owner commission receipt copy failed");
      }
    }

    // ── 4c. Création réservation calendrier (court séjour) ──────────────────
    if (tx.purpose === "commission" && tx.property_id) {
      try {
        const details = await Transaction.findLatestEvent(tx.id, "booking_details");
        if (details?.check_in && details?.booking_units) {
          const checkIn  = new Date(details.check_in);
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + Number(details.booking_units));
          await Booking.create(tx.property_id, tx.id, checkIn, checkOut);
          logger.info({ property_id: tx.property_id, check_in: details.check_in }, "booking créé");
        }
      } catch (e) {
        logger.warn({ err: e.message }, "booking creation failed");
      }
    }
  } catch (e) {
    logger.warn({ err: e.message, transaction_id: tx.id }, "Post-payment receipt block failed");
  }
}

module.exports = { handleSucceededPayment };
