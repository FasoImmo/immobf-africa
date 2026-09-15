"use strict";

/**
 * IndexNow — notification instantanée à Bing/Yandex dès qu'une annonce est publiée.
 * Doc : https://www.indexnow.org/documentation
 *
 * La clé doit être hébergée à :
 *   https://www.immoafrica.online/<INDEXNOW_KEY>.txt
 * et ce fichier doit contenir uniquement la clé (sans saut de ligne final).
 *
 * Variable d'env : INDEXNOW_KEY (défaut = clé déployée dans public/)
 */

const logger = require("../utils/logger");

const SITE_URL   = "https://www.immoafrica.online";
const KEY        = process.env.INDEXNOW_KEY || "c996df30d3184042ad0b05c2d815aad5";
const KEY_LOCATION = `${SITE_URL}/${KEY}.txt`;

// Endpoints supportant IndexNow (Bing partage les données avec Yandex automatiquement)
const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
];

/**
 * Notifie IndexNow pour une ou plusieurs URLs.
 * En cas d'échec réseau, on log et on continue sans bloquer la réponse API.
 *
 * @param {string|string[]} urls  URL(s) à soumettre
 */
async function notify(urls) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
  if (!list.length) return;

  const body = JSON.stringify({
    host:        new URL(SITE_URL).hostname,
    key:         KEY,
    keyLocation: KEY_LOCATION,
    urlList:     list,
  });

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body,
        signal:  AbortSignal.timeout(5000),
      });
      logger.info(`IndexNow ${endpoint} → ${res.status} (${list.length} URL(s))`);
    } catch (err) {
      // Non-bloquant : échec réseau ou timeout ignoré silencieusement
      logger.warn(`IndexNow ${endpoint} échoué : ${err.message}`);
    }
  }
}

/**
 * Notifie la publication d'une annonce immobilière.
 * @param {string} propertyId
 */
async function notifyProperty(propertyId) {
  const url = `${SITE_URL}/properties/${propertyId}`;
  // Fire-and-forget : ne pas bloquer la réponse API
  notify(url).catch(() => {});
}

module.exports = { notify, notifyProperty };
