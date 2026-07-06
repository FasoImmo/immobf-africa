"use strict";

/**
 * emailAlerts.js — cron quotidien qui envoie un email aux utilisateurs ayant
 * sauvegardé des critères de recherche, quand de nouvelles annonces correspondent.
 *
 * Fréquence : tous les jours à 09h00 (TZ Afrique Occidentale = UTC+0/+1)
 * On utilise node-cron (déjà présent pour expiryAlerts & reconciliation).
 */

const cron    = require("node-cron");
const logger  = require("../utils/logger");
const SavedSearch = require("../models/SavedSearch");
const Property    = require("../models/Property");
const { sendSearchAlert } = require("./email");

const BASE_URL = process.env.FRONTEND_URL || "https://www.immoafrica.online";

/**
 * Pour chaque recherche sauvegardée, récupère les annonces publiées depuis le
 * dernier envoi (ou les 24 dernières heures si jamais envoyé), et envoie un
 * email si au moins une annonce correspond.
 */
async function runEmailAlerts() {
  logger.info("emailAlerts: démarrage du run");
  let total = 0;
  let errors = 0;

  try {
    const pending = await SavedSearch.findPending();
    logger.info({ count: pending.length }, "emailAlerts: recherches à traiter");

    for (const search of pending) {
      try {
        // Calcule la date depuis laquelle chercher les nouvelles annonces
        const since = search.last_sent_at
          ? new Date(search.last_sent_at)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Construit les paramètres de recherche + filtre temporel
        const params = { ...(search.filters || {}), status: "published" };

        // Récupère les annonces correspondantes via Property.search
        const { items } = await Property.search(params);

        // Ne garde que celles publiées après `since`
        const fresh = items.filter((p) => new Date(p.created_at) > since);

        if (fresh.length === 0) {
          logger.debug({ id: search.id, email: search.email }, "emailAlerts: aucune nouvelle annonce");
          // On marque quand même pour éviter de retraiter en boucle
          await SavedSearch.markSent(search.id);
          continue;
        }

        const unsubscribeUrl = `${BASE_URL}/api/v1/searches/${search.id}/unsubscribe`;

        await sendSearchAlert(search.email, {
          properties: fresh.slice(0, 6), // max 6 annonces par email
          filters: search.filters || {},
          unsubscribeUrl,
        });

        await SavedSearch.markSent(search.id);
        total++;
        logger.info({ id: search.id, email: search.email, count: fresh.length }, "emailAlerts: envoyé");
      } catch (err) {
        errors++;
        logger.error({ err, id: search.id, email: search.email }, "emailAlerts: erreur sur une recherche");
      }
    }
  } catch (err) {
    logger.error({ err }, "emailAlerts: erreur critique");
  }

  logger.info({ total, errors }, "emailAlerts: run terminé");
}

function startEmailAlertsCron() {
  // Tous les jours à 09h00 UTC (= 09h en Afrique de l'Ouest, UTC+0)
  cron.schedule("0 9 * * *", () => {
    runEmailAlerts().catch((err) => logger.error({ err }, "emailAlerts cron uncaught"));
  });
  logger.info("emailAlerts: cron démarré (09h00 UTC)");
}

module.exports = { startEmailAlertsCron, runEmailAlerts };
