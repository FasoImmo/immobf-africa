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
  