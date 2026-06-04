"use strict";

// Sentry DOIT être initialisé en tout premier, avant tout autre require.
// Ce fichier est requis via --require dans le start script (ou en tête de server.js).

const Sentry = require("@sentry/node");

const dsn = process.env.SENTRY_DSN;

if (!dsn) {
  // En dev sans DSN configuré, on ne plante pas — on désactive silencieusement.
  if (process.env.NODE_ENV !== "production") {
    console.warn("[Sentry] SENTRY_DSN non défini — monitoring désactivé en dev.");
  } else {
    console.error("[Sentry] SENTRY_DSN manquant en production — erreurs non trackées !");
  }
} else {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.npm_package_version || "0.1.0",

    // Capture 100 % des transactions en prod pour avoir des traces dès le lancement.
    // Réduire à 0.1–0.2 quand le trafic monte (>1 000 req/jour).
    tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.0,

    // Ignorer les erreurs bénignes qui polluent le quota
    ignoreErrors: [
      "CORS: origin",          // origines bloquées par notre middleware
      "Not found",             // 404 normaux
      "ValidationError",       // erreurs Joi (erreurs utilisateur, pas des bugs)
    ],

    beforeSend(event) {
      // Ne pas remonter les erreurs de validation (status < 500)
      if (event.extra && event.extra.status && event.extra.status < 500) return null;
      return event;
    },
  });

  console.info(`[Sentry] Initialisé (env=${process.env.NODE_ENV})`);
}

module.exports = Sentry;
