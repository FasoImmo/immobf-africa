"use strict";

const cron = require("node-cron");
const { query } = require("../config/db");
const { sendExpiryAlert } = require("./email");
const logger = require("../utils/logger");

/**
 * Envoie des alertes d'expiration d'annonce par email :
 * - 7 jours avant expiration
 * - 1 jour avant expiration
 * Tourne tous les jours à 8h00 UTC (9h Ouagadougou)
 */
async function runExpiryAlerts() {
  logger.info("Running expiry alerts job");

  // Annonces qui expirent dans 7 jours (fenêtre : 7j ± 12h)
  const { rows: sevenDays } = await query(`
    SELECT p.id, p.title, p.listing_expires_at,
           u.email, u.full_name,
           EXTRACT(DAY FROM (p.listing_expires_at - NOW()))::int AS days_left
    FROM properties p
    JOIN users u ON u.id = p.owner_id
    WHERE p.status = 'published'
      AND u.email IS NOT NULL
      AND p.listing_expires_at BETWEEN NOW() + INTERVAL '6.5 days' AND NOW() + INTERVAL '7.5 days'
  `);

  // Annonces qui expirent dans 1 jour
  const { rows: oneDayRows } = await query(`
    SELECT p.id, p.title, p.listing_expires_at,
           u.email, u.full_name,
           EXTRACT(DAY FROM (p.listing_expires_at - NOW()))::int AS days_left
    FROM properties p
    JOIN users u ON u.id = p.owner_id
    WHERE p.status = 'published'
      AND u.email IS NOT NULL
      AND p.listing_expires_at BETWEEN NOW() + INTERVAL '0.5 days' AND NOW() + INTERVAL '1.5 days'
  `);

  const allAlerts = [...sevenDays, ...oneDayRows];
  logger.info({ count: allAlerts.length }, "Expiry alerts to send");

  for (const p of allAlerts) {
    try {
      await sendExpiryAlert(p.email, {
        propertyTitle: p.title,
        propertyId: p.id,
        daysLeft: p.days_left,
        expiresAt: p.listing_expires_at,
      });
    } catch (e) {
      logger.warn({ err: e.message, property_id: p.id }, "Failed to send expiry alert");
    }
  }
}

function startExpiryAlertsCron() {
  // Tous les jours à 8h00 UTC
  cron.schedule("0 8 * * *", async () => {
    try {
      await runExpiryAlerts();
    } catch (e) {
      logger.error({ err: e.message }, "Expiry alerts cron failed");
    }
  });
  logger.info("Expiry alerts cron scheduled (daily 08:00 UTC)");
}

module.exports = { startExpiryAlertsCron, runExpiryAlerts };
