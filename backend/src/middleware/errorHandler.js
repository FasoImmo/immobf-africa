"use strict";

const logger = require("../utils/logger");

module.exports = function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    logger.error({ err, url: req.originalUrl, method: req.method }, "Unhandled error");
  }
  res.status(status).json({
    error: {
      code: err.code || "internal_error",
      message: err.message || "Internal server error",
      details: err.details,
    },
  });
};
