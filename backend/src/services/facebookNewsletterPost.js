"use strict";

/**
 * Service de publication Facebook de la newsletter hebdomadaire.
 *
 * Contexte : la tâche planifiée Cowork "immobf-newsletter-hebdo" génère le
 * texte du post chaque semaine, mais son bash sandbox n'a pas d'accès réseau
 * à graph.facebook.com (proxy avec allowlist stricte — voir mémoire
 * "feedback-scheduled-task-network-allowlist"). Le texte est donc poussé
 * ici via git (backend/src/data/newsletter-fb-pending.json, committé +
 * pushé par la tâche planifiée), et c'est CE service — qui tourne sur
 * Railway avec un accès réseau normal — qui appelle réellement l'API
 * Facebook Graph.
 *
 * Fichier source : backend/src/data/newsletter-fb-pending.json
 *   { "text": "...", "generated_at": "<ISO>", "posted_at": null }
 *
 * Variable requise : FB_PAGE_ACCESS_TOKEN (Railway env var du service backend)
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const cron = require("node-cron");
const logger = require("../utils/logger");

const PAGE_ID = "1231000666764203"; // ID interne Business @immoafricabf
const FB_API_BASE = "https://graph.facebook.com/v20.0";
const SITE_BASE = "https://immoafrica.online";
const PENDING_FILE = path.join(__dirname, "..", "data", "newsletter-fb-pending.json");
const MAX_AGE_DAYS = 10; // ignorer un contenu trop ancien (signe d'un pipeline cassé en amont)

function httpPostJson(url, body) {
  const payload = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
          "User-Agent": "ImmoBF-Newsletter-FB-Publisher/1.0",
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => { raw += c; });
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
          catch (_) { resolve({ status: res.statusCode, body: raw }); }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Lit backend/src/data/newsletter-fb-pending.json et publie le post s'il n'a
 * pas déjà été publié cette semaine.
 * @param {{ force?: boolean }} opts - force=true republie même si posted_at est déjà rempli
 */
async function postPendingNewsletter(opts = {}) {
  const force = opts.force === true;

  if (!fs.existsSync(PENDING_FILE)) {
    logger.info("facebookNewsletterPost: aucun fichier en attente, rien à publier");
    return { skipped: true, reason: "no_file" };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(PENDING_FILE, "utf8"));
  } catch (e) {
    logger.error({ err: e.message }, "facebookNewsletterPost: JSON invalide");
    return { skipped: true, reason: "invalid_json" };
  }

  const { text, generated_at, posted_at } = data;

  if (!text || !text.trim()) {
    logger.warn("facebookNewsletterPost: champ text vide");
    return { skipped: true, reason: "empty_text" };
  }

  if (posted_at && !force) {
    logger.info({ posted_at }, "facebookNewsletterPost: déjà publié cette semaine");
    return { skipped: true, reason: "already_posted" };
  }

  if (generated_at) {
    const ageDays = (Date.now() - new Date(generated_at).getTime()) / 86400000;
    if (ageDays > MAX_AGE_DAYS && !force) {
      logger.warn({ generated_at, ageDays }, "facebookNewsletterPost: contenu trop ancien, ignoré");
      return { skipped: true, reason: "stale_content" };
    }
  }

  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    logger.error("facebookNewsletterPost: FB_PAGE_ACCESS_TOKEN absent des variables d'environnement");
    return { skipped: true, reason: "missing_token" };
  }

  try {
    const result = await httpPostJson(
      `${FB_API_BASE}/${PAGE_ID}/feed?access_token=${token}`,
      { message: text, link: `${SITE_BASE}/properties` }
    );

    if (result.status >= 200 && result.status < 300 && result.body?.id) {
      logger.info({ fb_post_id: result.body.id }, "facebookNewsletterPost: publié avec succès");
      try {
        fs.writeFileSync(
          PENDING_FILE,
          JSON.stringify(
            { ...data, posted_at: new Date().toISOString(), fb_post_id: result.body.id },
            null,
            2
          )
        );
      } catch (e) {
        logger.warn({ err: e.message }, "facebookNewsletterPost: échec écriture posted_at (non bloquant)");
      }
      return { skipped: false, fb_post_id: result.body.id };
    }

    logger.error({ status: result.status, body: result.body }, "facebookNewsletterPost: erreur API Facebook");
    return { skipped: true, reason: "fb_api_error", detail: result.body };
  } catch (e) {
    logger.error({ err: e.message }, "facebookNewsletterPost: erreur réseau");
    return { skipped: true, reason: "network_error" };
  }
}

/**
 * Cron hebdo : mardi 09h00 UTC — environ 50 min après la génération du
 * brouillon par la tâche planifiée Cowork (mardi 08h10, heure BF = UTC),
 * le temps que le commit soit poussé sur GitHub et que Railway redéploie.
 */
function startFacebookNewsletterCron() {
  cron.schedule(
    "0 9 * * 2",
    async () => {
      try {
        const result = await postPendingNewsletter();
        logger.info(result, "facebookNewsletterPost cron: cycle terminé");
      } catch (e) {
        logger.error({ err: e.message }, "facebookNewsletterPost cron: erreur");
      }
    },
    { timezone: "UTC" }
  );

  logger.info("Facebook newsletter cron scheduled (Tuesdays 09:00 UTC)");
}

module.exports = { postPendingNewsletter, startFacebookNewsletterCron, PENDING_FILE };
