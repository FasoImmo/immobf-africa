"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * Wave — Checkout API (web redirect).
 * Docs: https://docs.wave.com/business/checkout
 */
class WaveProvider extends PaymentProvider {
  get name() { return "wave"; }
  get countries() { return ["SN", "CI", "BF", "ML"]; }

  async initiate({ amount, currency = "XOF", reference, description }) {
    const { apiKey } = config.providers.wave;
    if (!apiKey) {
      return {
        external_id: `wave_stub_${reference}`,
        status: "pending",
        payment_url: `${config.webUrl}/mock-checkout?ref=${reference}&provider=wave`,
        raw: { stub: true, amount, currency, description },
      };
    }
    const res = await fetch("https://api.wave.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": reference,
      },
      body: JSON.stringify({
        amount: String(amount),
        currency,
        error_url: `${config.webUrl}/payment/cancelled?ref=${reference}`,
        success_url: `${config.webUrl}/payment/callback?ref=${reference}`,
        client_reference: reference,
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(`Wave init failed: ${body?.message || res.status}`);
      err.raw = body;
      throw err;
    }
    return {
      external_id: body.id,
      status: "pending",
      payment_url: body.wave_launch_url,
      raw: body,
    };
  }

  verifyWebhookSignature(headers, rawBody) {
    const { webhookSecret } = config.providers.wave;
    if (!webhookSecret) return true;
    const sig = headers["wave-signature"] || "";
    // Wave utilise format "t=...,v1=..." à parser ; version simplifiée :
    const parts = Object.fromEntries(sig.split(",").map(p => p.split("=")));
    const signedPayload = `${parts.t}.${rawBody}`;
    const digest = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
    return safeEqual(parts.v1 || "", digest);
  }

  parseWebhook(body) {
    const type = body?.type;
    let status = "pending";
    if (type === "checkout.session.completed") status = "succeeded";
    else if (type === "checkout.session.payment_failed") status = "failed";
    return {
      external_id: body?.data?.id,
      reference: body?.data?.client_reference,
      status,
      amount: body?.data?.amount ? Number(body.data.amount) : null,
      currency: body?.data?.currency || "XOF",
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

module.exports = WaveProvider;
