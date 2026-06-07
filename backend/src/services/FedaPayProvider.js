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

  isConfigured() {
    return Boolean(config.providers.fedapay.secretKey);
  }

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

    // Stub mode : pas de clé -> erreur si on est censé être en mode réel,
    // succès simulé seulement en dev local explicite.
    //
    // IMPORTANT : on ne se fie plus uniquement à NODE_ENV === "production"
    // (un mauvais réglage sur Railway suffisait à activer le mode simulation
    // et à afficher "Paiement confirmé" sans débiter qui que ce soit).
    // On bloque désormais dès que :
    //   - NODE_ENV === "production", OU
    //   - FEDAPAY_LIVE === "true" (signe explicite qu'on attend de vrais paiements)
    if (!secretKey) {
      const expectsRealPayments =
        process.env.NODE_ENV === "production" || config.providers.fedapay.live === true;
      if (expectsRealPayments) {
        throw Object.assign(
          new Error("FEDAPAY_SECRET_KEY manquant alors que des paiements réels sont attendus (NODE_ENV=production ou FEDAPAY_LIVE=true). Paiement refusé pour éviter une fausse confirmation."),
          { status: 500, code: "fedapay_not_configured" }
        );
      }
      logger.warn(
        { reference, fedapay_live: config.providers.fedapay.live },
        "FedaPay stub mode actif (clé absente, environnement de dev) — paiement auto-validé sans appel réel"
      );
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

    const phoneNumberPayload = customerPhone
      ? { number: this._localNumber(customerPhone), country: this._countryFromPhone(customerPhone) }
      : undefined;

    // Diagnostic temporaire — à supprimer après résolution
    logger.info({
      fedapay_customer_phone_input: customerPhone,
      fedapay_phone_number_payload: phoneNumberPayload,
    }, "FedaPay phone_number transformation");

    const txPayload = {
      description: description || "Paiement ImmoBF Africa",
      amount,
      currency: { iso: currency },
      callback_url: `${config.webUrl}/payment/return?ref=${reference}`,
      customer: {
        firstname: firstname || "Client",
        lastname,
        email: customerEmail || `noreply+${reference}@immobf.africa`,
        phone_number: phoneNumberPayload,
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
      // Diagnostic temporaire — affiche la réponse complète de FedaPay pour
      // identifier la cause exacte (code d'erreur précis, champ en faute, etc.)
      logger.error({
        fedapay_http_status: txRes.status,
        fedapay_response_body: txBody,
        fedapay_base_url: this._baseUrl(),
      }, "FedaPay transaction creation raw error response");
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
   * FedaPay attend le numéro LOCAL (sans indicatif pays) dans
   * `phone_number.number` — l'indicatif est fourni séparément via
   * `phone_number.country`. Envoyer "+22670000000" ou "22670000000"
   * provoque l'erreur API "phone_number.number n'est pas valide".
   * On retire donc l'indicatif pays détecté (et tout préfixe +/00).
   */
  _localNumber(phone) {
    let s = String(phone).replace(/[\s\-()]/g, "");
    s = s.replace(/^\+/, "").replace(/^00/, "");
    const codes = ["226", "225", "221", "228", "227", "229", "224", "223"];
    for (const c of codes) {
      if (s.startsWith(c) && s.length > c.length) {
        return s.slice(c.length);
      }
    }
    return s;
  }

  /**
   * Mapping rapide indicatif phone -> pays. Pour la prod, utiliser
   * libphonenumber-js. Ici on couvre BF + voisins.
   * FedaPay attend un code pays ISO 3166-1 alpha-2 EN MAJUSCULES
   * (ex. "BJ", pas "bj") — voir exemple officiel docs.fedapay.com.
   */
  _countryFromPhone(phone) {
    const s = String(phone).replace(/[\s+]/g, "");
    if (s.startsWith("226")) return "BF";
    if (s.startsWith("225")) return "CI";
    if (s.startsWith("221")) return "SN";
    if (s.startsWith("228")) return "TG";
    if (s.startsWith("227")) return "NE";
    if (s.startsWith("229")) return "BJ";
    if (s.startsWith("224")) return "GN";
    if (s.startsWith("223")) return "ML";
    return "BF"; // fallback Burkina
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
