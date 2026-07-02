"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * PayDunya — agrégateur UEMOA + Cameroun.
 *
 * Pourquoi PayDunya :
 *   - Self-service (inscription sur paydunya.com/signup, sandbox immédiat).
 *   - Opérateurs BF explicitement documentés : orange-money-burkina, moov-burkina-faso.
 *   - Couverture : BF, SN, CI, BJ, TG, ML, CM + cartes Visa/Mastercard.
 *   - 50 000+ transactions/jour — acteur établi depuis 2015.
 *
 * Docs : https://developers.paydunya.com/doc/FR/http_json
 *
 * Authentification : 3 clés dans les headers de chaque requête :
 *   PAYDUNYA-MASTER-KEY  (clé principale, sert aussi à vérifier les IPN)
 *   PAYDUNYA-PRIVATE-KEY (clé privée de l'application)
 *   PAYDUNYA-TOKEN       (token de l'application, généré dans le dashboard)
 *
 * Flow standard :
 *   1. POST /checkout-invoice/create  → { response_code:"00", response_text:"<url>", token:"..." }
 *   2. Redirection client vers response_text (page de paiement PayDunya)
 *   3. Client choisit son opérateur, paie.
 *   4. PayDunya POST notre callback_url en application/x-www-form-urlencoded
 *      avec le champ `data` contenant un objet JSON signé.
 *
 * Vérification IPN :
 *   hash = SHA-512(PAYDUNYA-MASTER-KEY) doit correspondre à data.hash reçu.
 *   Différent de FedaPay (HMAC-SHA256 sur payload) et de CinetPay (HMAC sur 16 champs).
 *   Voir https://developers.paydunya.com/doc/FR/http_json (section "Configuration de l'IPN").
 *
 * Note rawBody : PayDunya envoie les IPN en application/x-www-form-urlencoded.
 *   Le middleware rawBody.js parse le fallback URL-encoded → req.body.data est déjà
 *   un objet JS quand parseWebhook est appelé.
 */
class PayDunyaProvider extends PaymentProvider {
  get name() { return "paydunya"; }

  // Opérateurs disponibles par pays (doc mai 2026) — BF en tête.
  get countries() { return ["BF", "SN", "CI", "BJ", "TG", "ML", "CM"]; }
  get currencies() { return ["XOF", "XAF"]; }

  isConfigured() {
    const { masterKey, privateKey, token } = config.providers.paydunya;
    return Boolean(masterKey && privateKey && token);
  }

  _baseUrl() {
    return config.providers.paydunya.live === true
      ? "https://app.paydunya.com/api/v1"
      : "https://app.paydunya.com/sandbox-api/v1";
  }

  _authHeaders() {
    const { masterKey, privateKey, token } = config.providers.paydunya;
    return {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": masterKey,
      "PAYDUNYA-PRIVATE-KEY": privateKey,
      "PAYDUNYA-TOKEN": token,
    };
  }

  /**
   * Renvoie la liste des opérateurs à afficher selon l'indicatif téléphonique
   * du client, pour ne présenter que les wallets disponibles dans son pays.
   * `undefined` = pas de restriction → PayDunya affiche tous les opérateurs activés
   * sur le compte marchand.
   */
  _channelsForPhone(phone) {
    const s = String(phone || "").replace(/[\s+]/g, "");
    if (s.startsWith("226")) return ["orange-money-burkina", "moov-burkina-faso", "card"];
    if (s.startsWith("225")) return ["orange-money-ci", "wave-ci", "mtn-ci", "moov-ci", "card"];
    if (s.startsWith("221")) return ["orange-money-senegal", "wave-senegal", "free-money-senegal", "card"];
    if (s.startsWith("228")) return ["t-money-togo", "moov-togo", "card"];
    if (s.startsWith("229")) return ["mtn-benin", "moov-benin", "card"];
    if (s.startsWith("223")) return ["orange-money-mali", "moov-ml", "card"];
    if (s.startsWith("237")) return ["mtn-cameroun", "card"];
    return undefined;
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
  }) {
    const logger = require("../utils/logger");
    const { masterKey, privateKey, token, notifyUrl } = config.providers.paydunya;

    if (!masterKey || !privateKey || !token) {
      const expectsRealPayments =
        process.env.NODE_ENV === "production" || config.providers.paydunya.live === true;
      if (expectsRealPayments) {
        throw Object.assign(
          new Error("PAYDUNYA_MASTER_KEY / PRIVATE_KEY / TOKEN manquants alors que des paiements réels sont attendus. Paiement refusé."),
          { status: 500, code: "paydunya_not_configured" }
        );
      }
      logger.warn({ reference }, "PayDunya stub mode (dev) — paiement auto-validé sans appel réel");
      return {
        external_id: `pd_stub_${reference}`,
        status: "succeeded",
        payment_url: null,
        raw: { stub: true },
      };
    }

    const channels = this._channelsForPhone(customerPhone);

    const payload = {
      invoice: {
        total_amount: amount,
        description: description || "Paiement ImmoBF Africa",
        customer: {
          name: customerName || "Client",
          email: customerEmail || `noreply+${reference}@immoafrica.online`,
          phone: customerPhone
            ? String(customerPhone).replace(/[\s+]/g, "").replace(/^226/, "")
            : undefined,
        },
        ...(channels ? { channels } : {}),
      },
      store: {
        name: "ImmoBF Africa",
        website_url: "https://www.immoafrica.online",
        logo_url: "https://www.immoafrica.online/logo.png",
      },
      // custom_data est le seul endroit fiable pour retrouver notre référence
      // dans l'IPN — PayDunya le renvoie tel quel dans data.custom_data.
      custom_data: { reference, ...(metadata || {}) },
      actions: {
        callback_url: notifyUrl,
        return_url: `${config.webUrl}/payment/callback?ref=${reference}`,
        cancel_url: `${config.webUrl}/payment/callback?ref=${reference}&status=cancelled`,
      },
    };

    const res = await fetch(`${this._baseUrl()}/checkout-invoice/create`, {
      method: "POST",
      headers: this._authHeaders(),
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    if (body.response_code !== "00") {
      logger.error({
        paydunya_response: body,
        paydunya_base_url: this._baseUrl(),
      }, "PayDunya invoice creation failed");
      const err = new Error(`PayDunya create failed: ${body.response_text || body.response_code}`);
      err.raw = body;
      throw err;
    }

    // response_text contient l'URL de paiement quand response_code === "00"
    return {
      external_id: body.token,
      status: "pending",
      payment_url: body.response_text,
      raw: body,
    };
  }

  /**
   * Vérification IPN PayDunya.
   * La signature n'est PAS un HMAC sur le corps de la requête mais simplement
   * SHA-512 de la MASTER-KEY. PayDunya inclut ce hash dans data.hash de chaque IPN.
   * Comparaison constante (timingSafeEqual) pour éviter les timing attacks.
   */
  verifyWebhookSignature(headers, rawBody) {
    const { masterKey } = config.providers.paydunya;
    if (!masterKey) return true; // stub mode

    const parsed = this._parseIpnBody(rawBody);
    const receivedHash = parsed?.data?.hash || parsed?.hash;
    if (!receivedHash) return false;

    const expected = crypto.createHash("sha512").update(masterKey, "utf8").digest("hex");
    return safeEqual(receivedHash, expected);
  }

  /**
   * Parse le payload IPN PayDunya.
   * rawBody.js fallback URL-encoded → req.body = { data: <objet JS> }.
   * On accède donc à body.data directement.
   *
   * Champs utiles :
   *   data.invoice.token        → external_id (token PayDunya de la facture)
   *   data.custom_data.reference → notre référence IMO-...
   *   data.invoice.status       → "completed" | "failed" | "cancelled" | "pending"
   *   data.invoice.total_amount → montant
   */
  parseWebhook(body) {
    const data = (body?.data !== undefined && typeof body.data === "object")
      ? body.data
      : body;
    const invoiceStatus = data?.invoice?.status || data?.status || "";
    return {
      external_id: data?.invoice?.token || data?.token,
      reference: data?.custom_data?.reference,
      status: mapPayDunyaStatus(invoiceStatus),
      amount: data?.invoice?.total_amount ? Number(data.invoice.total_amount) : null,
      currency: "XOF",
      raw: body,
    };
  }

  /**
   * Parse le rawBody IPN qui peut être :
   *   - JSON direct (tests / webhooks re-envoyés depuis le dashboard)
   *   - application/x-www-form-urlencoded : data=<json_string>
   *     (format natif des IPN PayDunya en production)
   */
  _parseIpnBody(rawBody) {
    const s = typeof rawBody === "string" ? rawBody : (rawBody?.toString?.("utf8") || "");
    try { return JSON.parse(s); } catch { /* noop */ }
    try {
      const params = new URLSearchParams(s);
      const dataStr = params.get("data");
      if (dataStr) {
        try { return { data: JSON.parse(dataStr) }; } catch { return { data: dataStr }; }
      }
    } catch { /* noop */ }
    return {};
  }
}

function mapPayDunyaStatus(s) {
  switch (String(s || "").toLowerCase()) {
    case "completed": return "succeeded";
    case "failed":    return "failed";
    case "cancelled": return "failed";
    case "pending":
    default:          return "pending";
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

module.exports = PayDunyaProvider;
