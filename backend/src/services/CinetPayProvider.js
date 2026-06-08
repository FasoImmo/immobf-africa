"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * CinetPay — agrégateur multi-opérateurs (Orange Money, Moov, Wave, MTN…)
 * pour le Burkina, Côte d'Ivoire, Sénégal, Mali, Togo, Cameroun, etc.
 *
 * Docs: https://docs.cinetpay.com/
 * API base: https://api-checkout.cinetpay.com/v2
 */
class CinetPayProvider extends PaymentProvider {
  get name() { return "cinetpay"; }
  get countries() { return ["BF", "CI", "SN", "ML", "TG", "BJ", "CM"]; }
  get currencies() { return ["XOF", "XAF"]; }

  isConfigured() {
    const { apiKey, siteId } = config.providers.cinetpay;
    return Boolean(apiKey && siteId);
  }

  async initiate({ amount, currency = "XOF", reference, customerPhone, customerName, description, metadata }) {
    const { apiKey, siteId, notifyUrl } = config.providers.cinetpay;
    const payload = {
      apikey: apiKey,
      site_id: siteId,
      transaction_id: reference,
      amount,
      currency,
      description: description || "Paiement ImmoBF",
      notify_url: notifyUrl,
      return_url: `${config.webUrl}/payment/callback?ref=${reference}`,
      channels: "MOBILE_MONEY",
      customer_phone_number: customerPhone,
      customer_name: customerName,
      metadata: JSON.stringify(metadata || {}),
    };

    // Pour le MVP / dev sans secrets : on simule la réponse.
    // Sécurité : jamais de faux succès en production (afficherait "Paiement
    // confirmé" sans débiter le client).
    if (!apiKey || !siteId) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("CinetPay non configuré (clés manquantes) — paiement refusé en production."),
          { status: 500, code: "cinetpay_not_configured" }
        );
      }
      const logger = require("../utils/logger");
      logger.warn({ reference }, "CinetPay stub mode (dev) — paiement auto-validé sans appel réel");
      return {
        external_id: `cp_stub_${reference}`,
        status: "succeeded",
        payment_url: null,
        raw: { stub: true, payload },
      };
    }

    const res = await fetch("https://api-checkout.cinetpay.com/v2/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (body.code !== "201") {
      const err = new Error(`CinetPay initiate failed: ${body.message || body.code}`);
      err.raw = body;
      throw err;
    }
    return {
      external_id: body?.data?.payment_token || reference,
      status: "pending",
      payment_url: body?.data?.payment_url,
      raw: body,
    };
  }

  /**
   * Webhook CinetPay : header `x-token` = HMAC-SHA256 hex calculé sur la
   * CONCATÉNATION ORDONNÉE de 16 champs précis du corps (PAS sur le JSON brut
   * — piège similaire au format Stripe-like de FedaPay qu'on avait dû
   * corriger en b721a51). Ordre exact imposé par la doc CinetPay :
   *   cpm_site_id + cpm_trans_id + cpm_trans_date + cpm_amount + cpm_currency
   *   + signature + payment_method + cel_phone_num + cpm_phone_prefixe
   *   + cpm_language + cpm_version + cpm_payment_config + cpm_page_action
   *   + cpm_custom + cpm_designation + cpm_error_message
   * Voir https://docs.cinetpay.com/api/1.0-fr/checkout/hmac
   */
  verifyWebhookSignature(headers, rawBody) {
    const { secret } = config.providers.cinetpay;
    if (!secret) return true; // stub mode

    const token = headers["x-token"] || headers["x-Token"] || headers["x-signature"] || "";
    if (!token) return false;

    let body;
    try {
      body = typeof rawBody === "string" ? JSON.parse(rawBody) : JSON.parse(rawBody.toString("utf8"));
    } catch {
      return false;
    }

    const data = [
      body.cpm_site_id, body.cpm_trans_id, body.cpm_trans_date, body.cpm_amount,
      body.cpm_currency, body.signature, body.payment_method, body.cel_phone_num,
      body.cpm_phone_prefixe, body.cpm_language, body.cpm_version, body.cpm_payment_config,
      body.cpm_page_action, body.cpm_custom, body.cpm_designation, body.cpm_error_message,
    ].map((v) => (v == null ? "" : String(v))).join("");

    const expected = crypto.createHmac("sha256", secret).update(data, "utf8").digest("hex");
    return safeEqual(token, expected);
  }

  /**
   * Payload notification CinetPay : notre référence d'origine (= `transaction_id`
   * envoyé à l'initiation) revient dans `cpm_trans_id` — PAS dans `cpm_custom`
   * (qui contient notre `metadata` sérialisé). `cpm_trans_id` sert donc à la
   * fois d'`external_id` et de `reference` pour le lookup transaction.
   * `cpm_error_message` porte le statut texte ("SUCCES" en cas de succès,
   * raison de l'échec sinon) — à reconfirmer avec un vrai webhook de test.
   */
  parseWebhook(body) {
    const succeeded =
      body?.cpm_error_message === "SUCCES" ||
      body?.cpm_result === "00" ||
      body?.status === "ACCEPTED";
    return {
      external_id: body?.cpm_trans_id,
      reference: body?.cpm_trans_id,
      status: succeeded ? "succeeded" : "failed",
      amount: body?.cpm_amount ? Number(body.cpm_amount) : null,
      currency: body?.cpm_currency || "XOF",
      raw: body,
    };
  }
}

function safeEqual(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
}

module.exports = CinetPayProvider;
