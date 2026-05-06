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

app.use((_req, res) => res.status(404).json({ error: { code: "not_found", message: "Not found" } }));
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`ImmoBF API listening on :${config.port} (${config.env})`);
  });
}

module.exports = app;
