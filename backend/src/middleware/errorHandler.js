"use strict";

const logger = require("../utils/logger");

let Sentry;
try { Sentry = require("../instrument"); } catch (_) { /* Sentry optionnel */ }

module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error({ err, url: req.originalUrl, method: req.method }, "Unhandled error");
    // Remonter dans Sentry uniquement les vraies erreurs serveur (pas les 4xx)
    if (Sentry && Sentry.captureException) {
      Sentry.captureException(err, { extra: { url: req.originalUrl, method: req.method, status } });
    }
  }
  res.status(status).json({
    error: {
      code: err.code || "internal_error",
      message: err.message || "Internal server error",
      details: err.details,
    },
  });
};
