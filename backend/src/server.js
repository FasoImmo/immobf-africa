"use strict";

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
app.use(cors({ origin: true, credentials: true }));
app.use(pinoHttp({ logger }));

// JSON parser pour tout sauf les webhooks (qui utilisent rawBody middleware)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/payments/webhooks/")) return next();
  express.json({ limit: "1mb" })(req, res, next);
});

// Static uploads (dev)
app.use("/uploads", express.static(config.storage.localDir));

app.use("/api/v1", routes);

app.use((_req, res) => res.status(404).json({ error: { code: "not_found", message: "