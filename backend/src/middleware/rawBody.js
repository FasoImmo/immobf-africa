"use strict";

/**
 * Save the raw request body on `req.rawBody` so we can verify webhook HMAC signatures.
 * Use as the body parser for webhook routes.
 */
module.exports = function rawBody(req, res, next) {
  let data = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    req.rawBody = data;
    try {
      req.body = data.length ? JSON.parse(data) : {};
    } catch (_e) {
      req.body = {};
    }
    next();
  });
};
