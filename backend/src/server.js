"use strict";

// Sentry doit être le premier import — capture toutes les erreurs dès le boot.
const Sentry = require("./instrument");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pinoHttp = require("pino-http");

const config = require("./config");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const routes = require("./routes");

const app = express();

// Railway (et tout reverse-proxy) injecte X-Forwarded-For.
// Sans trust proxy, express-rate-limit lève ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// et retourne 400 sur toutes les requêtes.
app.set("trust proxy", 1);

app.use(helmet());

// CORS : whitelist explicite des domaines autorisés.
// En production, CORS_ORIGINS doit être défini dans les variables d'env Railway.
// Exemple : CORS_ORIGINS=https://www.immoafrica.online,https://immoafrica.online
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser les appels sans origin (ex : curl, Railway health checks, apps mobiles)
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // En développement, autoriser localhost
      if (config.env !== "production" && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      logger.warn({ origin }, "CORS blocked request from unauthorized origin");
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);
app.use(pinoHttp({ logger }));

// JSON parser pour tout sauf les webhooks (qui utilisent rawBody middleware)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/payments/webhooks/")) return next();
  express.json({ limit: "1mb" })(req, res, next);
});

// Static uploads (dev)
app.use("/uploads", express.static(config.storage.localDir));

app.use("/api/v1", routes);

app.use((_req, res) => res.status(404).json({ error: { code: "not_found", message: "Not found" } }));

// Sentry error handler DOIT être avant errorHandler et après toutes les routes.
if (Sentry.setupExpressErrorHandler) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`ImmoBF API listening on :${config.port} (${config.env})`);
    // Diagnostic FedaPay — vérifier que les variables sont bien chargées
    logger.info({
      fedapay_key_set: !!process.env.FEDAPAY_SECRET_KEY,
      fedapay_key_prefix: process.env.FEDAPAY_SECRET_KEY
        ? process.env.FEDAPAY_SECRET_KEY.substring(0, 10) + "..."
        : "NOT SET",
      fedapay_live: process.env.FEDAPAY_LIVE,
    }, "FedaPay config diagnostic");
    // Démarrer les alertes d'expiration d'annonce (cron quotidien)
    const { startExpiryAlertsCron } = require("./services/expiryAlerts");
    startExpiryAlertsCron();
  });
}

module.exports = app;
