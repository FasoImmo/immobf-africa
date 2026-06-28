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
    // 1. Essayer JSON (FedaPay, CinetPay, etc.)
    try {
      req.body = data.length ? JSON.parse(data) : {};
      return next();
    } catch (_e) {}
    // 2. Fallback : application/x-www-form-urlencoded (PayDunya IPN).
    //    Le champ `data` contient un objet JSON sérialisé — on le parse automatiquement
    //    pour que req.body.data soit directement un objet JS dans le contrôleur.
    try {
      const params = new URLSearchParams(data);
      const parsed = {};
      for (const [k, v] of params.entries()) {
        try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
      }
      req.body = Object.keys(parsed).length ? parsed : {};
    } catch {
      req.body = {};
    }
    next();
  });
};
