"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * Orange Money Burkina — API marchand (Web Payment / USSD Push).
 * Code USSD utilisateur : *144*4*6#
 * Docs: https://developer.orange.com/apis/om-webpay
 */
class OrangeMoneyProvider extends PaymentProvider {
  get name() { return "orange_money_bf"; }
  get countries() { return ["BF"]; }

  async initiate({ amount, currency = "XOF", reference, customerPhone, description }) {
    const { merchantKey, authHeader, notifyUrl } = config.providers.orangeMoney;

    // Mode stub pour dev / MVP sans secrets réels.
    if (!merchantKey || !authHeader) {
      return {
        external_id: `om_stub_${reference}`,
        status: "pending",
        ussd_code: "*144*4*6#",
        payment_url: `${config.webUrl}/mock-checkout?ref=${reference}&provider=orange_money`,
        raw: { stub: true, amount, currency, customerPhone, description },
      };
    }

    // 1) Get access token
    const tokenRes = await fetch("https://api.orange.com/oauth/v3/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenBody = await tokenRes.json();
    const accessToken = tokenBody.access_token;

    // 2) Init payment
    const initRes = await fetch("https://api.orange.com/orange-money-webpay/bf/v1/webpayment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        merchant_key: merchantKey,
        currency,
        order_id: reference,
        amount,
        return_url: `${config.webUrl}/payment/callback?ref=${reference}`,
        cancel_url: `${config.webUrl}/payment/cancelled?ref=${reference}`,
        notif_url: notifyUrl,
        lang: "fr",
        reference,
      }),
    });
    const initBody = await initRes.json();
    if (!initBody.pay_token) {
      const err = new Error(`OrangeMoney init failed: ${initBody.message || "unknown"}`);
      err.raw = initBody;
      throw err;
    }
    return {
      external_id: initBody.pay_token,
      status: "pending",
      payment_url: initBody.payment_url,
      ussd_code: "*144*4*6#",
      raw: initBody,
    };
  }

  verifyWebhookSignature(headers, rawBody) {
    const { webhookSecret } = config.providers.orangeMoney;
    if (!webhookSecret) return true;
    const sig = headers["x-orange-signature"] || headers["x-signature"] || "";
    const digest = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    return safeEqual(sig, digest);
  }

  parseWebhook(body) {
    return {
      external_id: body?.pay_token || body?.txnid,
      reference: body?.order_id || body?.reference,
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
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
}

module.exports = OrangeMoneyProvider;
