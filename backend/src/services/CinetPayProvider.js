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
    if (!apiKey || !siteId) {
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

  verifyWebhookSignature(headers, rawBody) {
    const { secret } = config.providers.cinetpay;
    if (!secret) return true; // stub mode
    const token = headers["x-token"] || headers["x-signature"] || "";
    const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return safeEqual(token, digest);
  }

  parseWebhook(body) {
    return {
      external_id: body?.cpm_trans_id || body?.payment_token,
      reference: body?.cpm_custom || body?.transaction_id,
      status: body?.cpm_result === "00" || body?.status === "ACCEPTED" ? "succeeded" : "failed",
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
