"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * FedaPay — agrégateur paiement pan-UEMOA + Guinée.
 *
 * Pourquoi FedaPay :
 *   - Un seul contrat marchand, plusieurs opérateurs : Orange Money, Moov,
 *     MTN MoMo, Wave, Visa/Mastercard.
 *   - Couverture : Bénin (origine), Côte d'Ivoire, Sénégal, Togo, Niger,
 *     Burkina Faso, Mali, Guinée Conakry.
 *   - Devises : XOF, GNF.
 *   - Webhook signé HMAC-SHA256 (header `x-fedapay-signature`).
 *
 * Docs API :
 *   - https://docs.fedapay.com/integration-api
 *   - https://docs.fedapay.com/notification (webhooks)
 *
 * Authentification : `Authorization: Bearer <FEDAPAY_SECRET_KEY>`
 *   sk_live_… en production / sk_test_… en sandbox.
 *
 * Flow standard :
 *   1. POST /v1/transactions  -> retourne { id, reference, ... }
 *   2. POST /v1/transactions/{id}/token  -> retourne { token, url }
 *   3. Redirection client vers `url` OU envoi USSD côté wallet selon mode.
 *   4. FedaPay POST notre webhook quand status change (`approved`, `declined`,
 *      `canceled`, `refunded`).
 */
class FedaPayProvider extends PaymentProvider {
  get name() { return "fedapay"; }

  // Pays supportés - voir https://docs.fedapay.com (mai 2026).
  // BF en tête car c'est notre marché principal.
  get countries() { return ["BF", "BJ", "CI", "SN", "TG", "NE", "ML", "GN"]; }

  get currencies() { return ["XOF", "GNF"]; }

  /**
   * Mode sandbox quand FEDAPAY_LIVE != "true" -> base URL sandbox.
   * Stub mode quand pas de secret_key -> retourne payload simulé sans
   * appel HTTP réel (pour les tests CI et la démo locale).
   */
  _baseUrl() {
    return config.providers.fedapay.live === true
      ? "https://api.fedapay.com/v1"
      : "https://sandbox-api.fedapay.com/v1";
  }

  async initiate({
    amount,
    currency = "XOF",
    reference,
    customerPhone,
    customerEmail,
    customerName,
    description,
    metadata,
    preferredOperator, // "orange", "moov", "mtn", "wave", "card", undefined = let user choose
  }) {
    const { secretKey, notifyUrl, returnUrl } = config.providers.fedapay;

    // Diagnostic temporaire — à supprimer après résolution
    const logger = require("../utils/logger");
    logger.info({
      fedapay_secret_key_set: !!secretKey,
      fedapay_secret_key_prefix: secretKey ? secretKey.substring(0, 10) + "..." : "NOT SET",
      fedapay_live: config.providers.fedapay.live,
    }, "FedaPay initiate called");

    // Stub mode : pas de clé -> erreur en production, succès simulé en dev
    if (!secretKey) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(new Error("FEDAPAY_SECRET_KEY not set in production"), { status: 500, code: "fedapay_not_configured" });
      }
      return {
        external_id: `fp_stub_${reference}`,
        status: "succeeded",
        payment_url: null,
        ussd_code: null,
        raw: { stub: true, note: "FEDAPAY_SECRET_KEY not set — auto-succeeded" },
      };
    }

    const [firstname, ...rest] = String(customerName || "").trim().split(" ");
    const lastname = rest.join(" ") || firstname || "Client";

    const txPayload = {
      description: description || "Paiement ImmoBF Africa",
      amount,
      currency: { iso: currency },
      callback_url: `${config.webUrl}/payment/return?ref=${reference}`,
      customer: {
        firstname: firstname || "Client",
        lastname,
        email: customerEmail || `noreply+${reference}@immobf.africa`,
        phone_number: customerPhone
          ? { number: customerPhone, country: this._countryFromPhone(customerPhone) }
          : undefined,
      },
      metadata: { reference, ...(metadata || {}) },
    };

    // 1) Create transaction
    const txRes = await fetch(`${this._baseUrl()}/transactions`, {
      method: "POST",
      headers: this._authHeaders(secretKey),
      body: JSON.stringify(txPayload),
    });
    const txBody = await txRes.json();
    if (!txRes.ok || !txBody?.["v1/transaction"]?.id) {
      const err = new Error(`FedaPay create failed: ${txBody?.message || txRes.status}`);
      err.raw = txBody;
      throw err;
    }
    const txId = txBody["v1/transaction"].id;

    // 2) Generate payment token + URL
    const tokenRes = await fetch(`${this._baseUrl()}/transactions/${txId}/token`, {
      method: "POST",
      headers: this._authHeaders(secretKey),
    });
    const tokenBody = await tokenRes.json();
    if (!tokenRes.ok || !tokenBody?.url) {
      const err = new Error(`FedaPay token failed: ${tokenBody?.message || tokenRes.status}`);
      err.raw = tokenBody;
      throw err;
    }

    return {
      external_id: String(txId),
      status: "pending",
      payment_url: tokenBody.url,
      // FedaPay redirige l'utilisateur vers une page de checkout qui propose
      // tous les wallets ; pas d'USSD direct côté API, sauf via opérateur direct.
      ussd_code: this._stubUssdFor(preferredOperator),
      raw: { transaction: txBody, token: tokenBody },
    };
  }

  /**
   * Webhook FedaPay : header `x-fedapay-signature` = HMAC SHA256 hex
   * du body brut signé avec la `webhookSecret`.
   * Voir https://docs.fedapay.com/notification#signature
   */
  verifyWebhookSignature(headers, rawBody) {
    const { webhookSecret } = config.providers.fedapay;
    if (!webhookSecret) return true; // stub mode
    const sig = headers["x-fedapay-signature"] || headers["X-Fedapay-Signature"] || "";
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");
    return safeEqual(sig, expected);
  }

  /**
   * Payload typique :
   *   {
   *     "name": "transaction.approved",
   *     "entity": { "id": 12345, "reference": "...", "amount": 4250000,
   *                 "currency": { "iso": "XOF" }, "status": "approved",
   *                 "metadata": { "reference": "IMO-..." } }
   *   }
   */
  parseWebhook(body) {
    const entity = body?.entity || body?.data || body || {};
    const evt = body?.name || entity?.status || "";
    const status = mapFedaPayStatus(entity?.status || evt);
    return {
      external_id: entity?.id != null ? String(entity.id) : undefined,
      reference: entity?.metadata?.reference || entity?.reference,
      status,
      amount: entity?.amount != null ? Number(entity.amount) : null,
      currency: entity?.currency?.iso || "XOF",
      raw: body,
    };
  }

  async refund({ externalId }) {
    const { secretKey } = config.providers.fedapay;
    if (!secretKey) {
      return { status: "refunded", external_id: externalId, raw: { stub: true } };
    }
    const res = await fetch(`${this._baseUrl()}/refunds`, {
      method: "POST",
      headers: this._authHeaders(secretKey),
      body: JSON.stringify({ transaction_id: Number(externalId) }),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(`FedaPay refund failed: ${body?.message || res.status}`);
      err.raw = body;
      throw err;
    }
    return { status: "refunded", external_id: externalId, raw: body };
  }

  // ---------- helpers ----------

  _authHeaders(secretKey) {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
    };
  }

  /**
   * Mapping rapide indicatif phone -> pays. Pour la prod, utiliser
   * libphonenumber-js. Ici on couvre BF + voisins.
   */
  _countryFromPhone(phone) {
    const s = String(phone).replace(/[\s+]/g, "");
    if (s.startsWith("226")) return "bf";
    if (s.startsWith("225")) return "ci";
    if (s.startsWith("221")) return "sn";
    if (s.startsWith("228")) return "tg";
    if (s.startsWith("227")) return "ne";
    if (s.startsWith("229")) return "bj";
    if (s.startsWith("224")) return "gn";
    if (s.startsWith("223")) return "ml";
    return "bf"; // fallback Burkina
  }

  _stubUssdFor(op) {
    switch (op) {
      case "orange": return "*144*4*6#";
      case "moov":   return "*555*6#";
      case "mtn":    return "*133#";
      default:       return null;
    }
  }
}

function mapFedaPayStatus(s) {
  switch (String(s)) {
    case "transaction.approved":
    case "approved":
      return "succeeded";
    case "transaction.declined":
    case "declined":
    case "transaction.canceled":
    case "canceled":
      return "failed";
    case "transaction.refunded":
    case "refunded":
      return "refunded";
    case "pending":
    case "transaction.pending":
    default:
      return "pending";
  }
}

function safeEqual(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

module.exports = FedaPayProvider;
