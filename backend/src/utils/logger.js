"use strict";

const pino = require("pino");
const config = require("../config");

const logger = pino({
  level: config.logLevel,
  redact: ["req.headers.authorization", "*.password", "*.password_hash", "*.token"],
});

module.exports = logger;
