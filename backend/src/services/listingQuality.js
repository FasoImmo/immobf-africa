"use strict";

/**
 * Service d'analyse qualité des annonces.
 *
 * Score de 0 à 100 par annonce. Critères pondérés :
 *   - Photos     : 0 photo → -40 pts, 1-2 photos → -20 pts
 *   - GPS        : pas de coordonnées → -20 pts
 *   - Description: < 80 caractères → -15 pts
 *   - Prix       : manquant → -25 pts (critique)
 *   - Ville      : manquante → -20 pts (critique)
 *   - Surface    : manquante → -10 pts (suggestion)
 *
 * Un email consolidé est envoyé à chaque annonceur (une fois par annonce
 * tous les 7 jours max) listant toutes ses annonces avec des recommandations
 * personnalisées.
 */

const { query } = require("../config/db");
const { sendListingQualityAlert } = require("./email");
const logger = require("../utils/logger");
const cron = require("node-cron");

// ─── Moteur de scoring ────────────────────────────────────────────────────────

/**
 * Analyse une annonce et retourne son score + la liste des problèmes détectés.
 * @param {object} p - ligne property (avec nb_photos et location)
 * @returns {{ score: number, issues: Array }}
 */
function scoreProperty(p) {
  const issues = [];
  let score = 100;
  const photoCount = Number(p.nb_photos || 0);

  // ── Photos ──────────────────────────────────────────────────────────────────
  if (photoCount === 0) {
    score -= 40;
    issues.push({
      code: "no_photos",
      severity: "critical",
      label: "Aucune photo",
      tip: "Ajoutez au moins 3 photos (façade, intérieur, vue). Les annonces avec photos reçoivent 5× plus de vues.",
    });
  } else if (photoCount < 3) {
    score -= 20;
    issues.push({
      code: "few_photos",
      severity: "warning",
      label: `${photoCount} photo${photoCount > 1 ? "s" : ""} seulement`,
      tip: `Ajoutez ${3 - photoCount} photo(s) supplémentaire(s). Les annonces avec 3+ photos génèrent 3× plus de contacts.`,
    });
  }

  // ── GPS ─────────────────────────────────────────────────────────────────────
  if (!p.lat || !p.lng) {
    score -= 20;
    issues.push({
      code: "no_gps",
      severity: "warning",
      label: "Localisation GPS manquante",
      tip: "Ajoutez les coordonnées GPS de votre bien. Les acheteurs filtrent par distance sur la carte.",
    });
  }

  // ── Description ─────────────────────────────────────────────────────────────
  const descLen = (p.description || "").trim().length;
  if (descLen < 80) {
    score -= 15;
    issues.push({
      code: "short_description",
      severity: "warning",
      label: descLen === 0 ? "Description absente" : `Description trop courte (${descLen} car.)`,
      tip: "Décrivez l'état du bien, les équipements, le quartier, les commodités proches. Minimum 200 caractères recommandé.",
    });
  }

  // ── Prix ────────────────────────────────────────────────────────────────────
  if (!p.price || Number(p.price) <= 0) {
    score -= 25;
    issues.push({
      code: "no_price",
      severity: "critical",
      label: "Prix non renseigné",
      tip: "Un prix visible augmente fortement le taux de contact, même s'il est indiqué comme 'à négocier'.",
    });
  }

  // ── Ville ───────────────────────────────────────────────────────────────────
  if (!p.city || !p.city.trim()) {
    score -= 20;
    issues.push({
      code: "no_city",
      severity: "critical",
      label: "Ville non renseignée",
      tip: "La ville est indispensable pour apparaître dans les recherches géographiques.",
    });
  }

  // ── Surface ─────────────────────────────────────────────────────────────────
  if (!p.area_m2) {
    score -= 10;
    issues.push({
      code: "no_surface",
      severity: "suggestion",
      label: "Superficie non renseignée",
      tip: "Indiquez la superficie en m² pour apparaître dans les filtres de superficie.",
    });
  }

  return { score: Math.max(0, score), issues };
}

// ─── Requête DB : annonces publiées avec leurs stats ─────────────────────────

/**
 * Retourne toutes les annonces publiées enrichies :
 *  - nb_photos : nombre de photos téléversées
 *  - score + issues calculés
 *  - email/nom du propriétaire
 */
async function analyzeAllPublished() {
  const { rows } = await query(`
    SELECT
      p.id, p.title, p.description, p.price, p.city, p.area_m2,
      p.lat, p.lng, p.owner_id, p.quality_alert_sent_at,
      p.listing_expires_at,
      u.full_name AS owner_name,
      u.email     AS owner_email,
      COUNT(ph.id)::int AS nb_photos
    FROM properties p
    LEFT JOIN users           u  ON u.id  = p.owner_id
    LEFT JOIN property_photos ph ON ph.property_id = p.id
    WHERE p.status = 'published'
      AND u.email IS NOT NULL
    GROUP BY p.id, u.full_name, u.email
    ORDER BY p.created_at DESC
  `);

  return rows.map((p) => {
    const { score, issues } = scoreProperty(p);
    return { ...p, score, issues };
  });
}

// ─── Cron d'alertes qualité ───────────────────────────────────────────────────

/**
 * Envoie des emails d'amélioration aux annonceurs dont au moins une annonce
 * a un score < 70 ET n'a pas encore reçu d'alerte dans les 7 derniers jours.
 *
 * Groupé par propriétaire : un seul email par annonceur, listant toutes ses
 * annonces à améliorer.
 *
 * @param {{ force?: boolean }} opts - force=true ignore l'anti-spam 7 jours
 * @returns {{ sent: number, skipped: number, errors: number }}
 */
async function runQualityAlerts(opts = {}) {
  const force = opts.force === true;
  logger.info({ force }, "listingQuality: démarrage analyse qualité");

  const all = await analyzeAllPublished();

  // Filtrer celles qui ont des problèmes ET n'ont pas été notifiées récemment
  const COOLDOWN_DAYS = 7;
  const needsAlert = all.filter((p) => {
    if (p.score >= 80) return false;               // annonce correcte
    if (p.issues.length === 0) return false;
    if (!force && p.quality_alert_sent_at) {
      const daysSince = (Date.now() - new Date(p.quality_alert_sent_at).getTime()) / 86400000;
      if (daysSince < COOLDOWN_DAYS) return false; // déjà notifié récemment
    }
    return true;
  });

  if (!needsAlert.length) {
    logger.info("listingQuality: aucune annonce à notifier");
    return { sent: 0, skipped: all.length, errors: 0 };
  }

  // Grouper par propriétaire
  const byOwner = {};
  for (const p of needsAlert) {
    if (!byOwner[p.owner_id]) {
      byOwner[p.owner_id] = { email: p.owner_email, name: p.owner_name, properties: [] };
    }
    byOwner[p.owner_id].properties.push(p);
  }

  let sent = 0;
  let errors = 0;

  for (const [ownerId, owner] of Object.entries(byOwner)) {
    if (!owner.email) continue;
    try {
      await sendListingQualityAlert(owner.email, {
        ownerName: owner.name,
        properties: owner.properties,
      });

      // Marquer chaque annonce comme notifiée
      const ids = owner.properties.map((p) => p.id);
      await query(
        `UPDATE properties SET quality_alert_sent_at = NOW() WHERE id = ANY($1::uuid[])`,
        [ids]
      );

      sent++;
      logger.info(
        { owner_id: ownerId, email: owner.email, nb_properties: ids.length },
        "listingQuality: email envoyé"
      );
    } catch (e) {
      errors++;
      logger.error(
        { err: e.message, owner_id: ownerId, email: owner.email },
        "listingQuality: erreur envoi email"
      );
    }
  }

  logger.info({ sent, skipped: all.length - needsAlert.length, errors }, "listingQuality: terminé");
  return { sent, skipped: all.length - needsAlert.length, errors };
}

// ─── Démarrage du cron ────────────────────────────────────────────────────────

/**
 * Lance le cron d'alertes qualité.
 * Fréquence : tous les lundis à 08h00 UTC.
 */
function startListingQualityCron() {
  // Lundi 08:00 UTC
  cron.schedule("0 8 * * 1", async () => {
    try {
      const result = await runQualityAlerts();
      logger.info(result, "listingQuality cron: cycle terminé");
    } catch (e) {
      logger.error({ err: e.message }, "listingQuality cron: erreur");
    }
  }, { timezone: "UTC" });

  logger.info("Listing quality cron scheduled (Mondays 08:00 UTC)");
}

module.exports = { analyzeAllPublished, runQualityAlerts, startListingQualityCron, scoreProperty };
