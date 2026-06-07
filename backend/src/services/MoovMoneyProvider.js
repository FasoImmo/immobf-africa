"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * Moov Money Burkina — USSD *555*6#
 * Intégration marchand via agrégateur CinetPay recommandée si pas d'accord direct.
 * Ce provider garde l'option d'un canal direct pour quand un accord est signé.
 */
class MoovMoneyProvider extends PaymentProvider {
  get name() { return "moov_money_bf"; }
  get countries() { return ["BF", "TG", "BJ", "NE"]; }

  isConfigured() {
    const { username, password } = config.providers.moovMoney;
    return Boolean(username && password);
  }

  async initiate({ amount, currency = "XOF", reference, customerPhone, description }) {
    const { username, password } = config.providers.moovMoney;
    if (!username || !password) {
      // Sécurité : ne jamais simuler un succès de paiement en production —
      // cela afficherait "Paiement confirmé" au client sans le débiter.
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("Moov Money non configuré (identifiants manquants) — paiement refusé en production."),
          { status: 500, code: "moov_money_not_configured" }
        );
      }
      const logger = require("../utils/logger");
      logger.warn({ reference }, "Moov Money stub mode (dev) — paiement auto-validé sans appel réel");
      return {
        external_id: `moov_stub_${reference}`,
        status: "succeeded",
        ussd_code: null,
        payment_url: null,
        raw: { stub: true, amount, currency, customerPhone, description },
      };
    }

    // Canal direct (à adapter à l'API réelle fournie par Moov Africa Burkina)
    const res = await fetch("https://api.moov-africa.bf/merchant/v1/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${username}:${password}`).toString("base64"),
      },
      body: JSON.stringify({
        reference,
        amount,
        currency,
        msisdn: customerPhone,
        description: description || "ImmoBF payment",
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(`Moov Money init failed: ${body?.message || res.status}`);
      err.raw = body;
      throw err;
    }
    return {
      external_id: body.transaction_id,
      status: body.status === "SUCCESS" ? "succeeded" : "pending",
      ussd_code: "*555*6#",
      raw: body,
    };
  }

  verifyWebhookSignature(headers, rawBody) {
    const { webhookSecret } = config.providers.moovMoney;
    if (!webhookSecret) return true;
    const sig = headers["x-moov-signature"] || "";
    const digest = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return safeEqual(sig, digest);
  }

  parseWebhook(body) {
    return {
      external_id: body?.transaction_id,
      reference: body?.reference,
      status: body?.status === "SUCCESS" ? "succeeded"
            : body?.status === "FAILED"  ? "failed"
            : "pending",
      amount: body?.amount != null ? Number(body.amount) : null,
      currency: body?.currency || "XOF",
      raw: body,
    };
  }
}

function safeEqual(a, b) {
  try {
    const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
}

module.exports = MoovMoneyProvider;
