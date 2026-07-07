"use strict";
/**
 * CinetPayProvider — API "1.0 Aurore" (panel.cinetpay.net)
 *
 * Auth OAuth2:  POST /v1/oauth/login { api_key, api_password } → Bearer token (86400s)
 * Paiement:     POST /v1/payment (Bearer) → { data.payment_url }
 * Statut:       GET  /v1/payment/{merchant_transaction_id} (Bearer) → statut canonique
 * Webhook:      Simple signal — parseWebhook() re-vérifie via GET statut.
 *               Ne JAMAIS faire confiance au statut transmis dans le payload entrant
 *               (cf. avertissement sécurité doc CinetPay "1.0 Aurore").
 *
 * Variables d'environnement :
 *   CINETPAY_API_KEY      — clé API (panneau Ressources > API & sécurité > "API Key")
 *   CINETPAY_API_PASSWORD — mot de passe API (à créer dans le panneau > "Définir un mot de passe API")
 *   CINETPAY_NOTIFY_URL   — URL du webhook (ex: https://api.immoafrica.online/api/webhooks/cinetpay)
 *
 * Limite CinetPay : merchant_transaction_id ≤ 30 chars.
 * La référence ImmoBF "IMO-{13digits}-{8hex}" = 26 chars → OK sans troncature.
 *
 * Couverture Sandbox validée le 07/07/2026 (compte mahamady-koussoube, BF).
 * Docs : https://panel.cinetpay.net/mahamady-koussoube/developer/documentation
 */

const PaymentProvider = require("./PaymentProvider");
const config          = require("../config");
const logger          = require("../utils/logger");

const BASE_URL = "https://api.cinetpay.net";

class CinetPayProvider extends PaymentProvider {
  constructor() {
    super();
    /** @type {string|null} Bearer token mis en cache */
    this._token       = null;
    /** @type {number} Timestamp (ms) d'expiration du token */
    this._tokenExpiry = 0;
  }

  get name()       { return "cinetpay"; }
  get label()      { return "CinetPay (Orange Money, Moov, Wave…)"; }
  get countries()  { return ["BF", "CI", "SN", "CM", "ML", "GN", "TG", "BJ"]; }
  get currencies() { return ["XOF", "XAF", "GNF"]; }

  isAvailable() {
    const { apiKey, apiPassword } = config.providers.cinetpay;
    return Boolean(apiKey && apiPassword);
  }

  /**
   * La nouvelle API "1.0 Aurore" n'utilise plus de signature HMAC sur les webhooks.
   * La sécurité est assurée par la re-vérification du statut via
   * GET /v1/payment/{merchant_transaction_id} dans parseWebhook().
   */
  verifyWebhookSignature(_headers, _rawBody) { return true; }

  // ── Authentification OAuth2 ───────────────────────────────────────────────

  /**
   * Obtient (ou réutilise) le Bearer token.
   * Durée de vie : 86 400 s (24 h). Rafraîchi 60 s avant expiration.
   */
  async _getToken() {
    if (this._token && Date.now() < this._tokenExpiry - 60_000) {
      return this._token;
    }

    const { apiKey, apiPassword } = config.providers.cinetpay;
    const res = await fetch(`${BASE_URL}/v1/oauth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body:    JSON.stringify({ api_key: apiKey, api_password: apiPassword }),
    });
    const body = await res.json();

    if (!res.ok || body.code !== 200) {
      throw Object.assign(
        new Error(`CinetPay auth failed (${body.code}): ${body.message || body.status}`),
        { status: 502, code: "cinetpay_auth_failed", raw: body }
      );
    }

    this._token       = body.access_token;
    this._tokenExpiry = Date.now() + body.expires_in * 1000;
    logger.debug("CinetPay token rafraîchi");
    return this._token;
  }

  _headers(token) {
    return {
      "Content-Type": "application/json",
      Accept:         "application/json",
      Authorization:  `Bearer ${token}`,
    };
  }

  // ── Initialisation du paiement ────────────────────────────────────────────

  async initiate(payment) {
    const { notifyUrl } = config.providers.cinetpay;

    // ── Mode stub (dev sans clés) ─────────────────────────────────────────
    if (!this.isAvailable()) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn({ reference: payment.reference }, "CinetPay stub mode — succès auto");
        return {
          status:      "succeeded",
          payment_url: null,
          external_id: payment.reference,
          raw:         {},
        };
      }
      throw Object.assign(
        new Error("CinetPay non configuré (clés manquantes) — paiement refusé en production."),
        { status: 500, code: "cinetpay_not_configured" }
      );
    }

    const token = await this._getToken();

    // ── Prénom / Nom séparés (l'API exige les deux champs) ────────────────
    const fullName  = (payment.customerName || "Client ImmoBF").trim();
    const spaceIdx  = fullName.indexOf(" ");
    const firstName = (spaceIdx > 0 ? fullName.substring(0, spaceIdx) : fullName).substring(0, 255);
    const lastName  = (spaceIdx > 0 ? fullName.substring(spaceIdx + 1) : "ImmoBF").substring(0, 255);

    // ── URLs de retour (max 120 chars selon doc) ──────────────────────────
    const siteBase       = process.env.NEXT_PUBLIC_SITE_URL || "https://www.immoafrica.online";
    const successUrl     = `${siteBase}/payment/success?ref=${payment.reference}`.substring(0, 120);
    const failedUrl      = `${siteBase}/payment/cancel?ref=${payment.reference}`.substring(0, 120);
    const notifyEndpoint = (notifyUrl || `${siteBase}/api/webhooks/cinetpay`).substring(0, 120);

    const payload = {
      currency:                payment.currency || "XOF",
      merchant_transaction_id: payment.reference,   // IMO-{13digits}-{8hex} = 26 chars ≤ 30 ✓
      amount:                  Math.round(payment.amount),
      lang:                    "fr",
      designation:             (payment.description || "Paiement ImmoBF Africa").substring(0, 100),
      client_email:            payment.customerEmail || "noreply@immoafrica.online",
      client_phone_number:     payment.customerPhone || undefined,
      client_first_name:       firstName,
      client_last_name:        lastName,
      success_url:             successUrl,
      failed_url:              failedUrl,
      notify_url:              notifyEndpoint,
    };

    const res = await fetch(`${BASE_URL}/v1/payment`, {
      method:  "POST",
      headers: this._headers(token),
      body:    JSON.stringify(payload),
    });
    const body = await res.json();

    if (!res.ok || (body.code && body.code !== 200 && body.code !== 201)) {
      const err = Object.assign(
        new Error(`CinetPay initiate failed (${body.code}): ${body.message || JSON.stringify(body)}`),
        { status: 502, code: "cinetpay_initiate_failed", raw: body }
      );
      logger.error({ reference: payment.reference, body }, "CinetPay erreur initiate");
      throw err;
    }

    const paymentUrl = body.data?.payment_url || body.payment_url;
    logger.info({ reference: payment.reference, paymentUrl }, "CinetPay paiement initié");

    return {
      status:      "pending",
      payment_url: paymentUrl,
      external_id: payment.reference,
      raw:         body,
    };
  }

  // ── Statut canonique ──────────────────────────────────────────────────────

  /**
   * Récupère le statut officiel d'une transaction via l'API CinetPay.
   * Utilisé par parseWebhook() ET par le cron de réconciliation.
   */
  async checkStatus(reference) {
    if (!this.isAvailable()) return null;
    const token = await this._getToken();
    const res   = await fetch(
      `${BASE_URL}/v1/payment/${encodeURIComponent(reference)}`,
      { method: "GET", headers: this._headers(token) }
    );
    const body = await res.json();
    return this._normalizeStatus(body);
  }

  /**
   * Mappe le statut brut CinetPay vers les valeurs internes ImmoBF.
   */
  _normalizeStatus(body) {
    const rawStatus = (body?.data?.status || body?.status || "").toUpperCase();
    let status;
    switch (rawStatus) {
      case "SUCCESS":
      case "ACCEPTED":
        status = "succeeded"; break;
      case "FAILED":
      case "REFUSED":
      case "CANCELLED":
        status = "failed"; break;
      default:
        status = "pending";
    }
    const reference = body?.data?.merchant_transaction_id ?? null;
    return {
      reference,
      status,
      external_id: body?.data?.id || reference,
      raw:         body,
    };
  }

  // ── Webhook ───────────────────────────────────────────────────────────────
  /**
   * AVERTISSEMENT SÉCURITÉ CinetPay (doc "1.0 Aurore") :
   * Ne jamais faire confiance au statut transmis dans le payload entrant.
   * Le webhook est un simple signal « regardez cette transaction ».
   *
   * → On extrait merchant_transaction_id du payload, puis on appelle
   *   GET /v1/payment/{merchant_transaction_id} pour le statut canonique.
   *
   * IMPORTANT : cette méthode est ASYNC. Le webhook handler doit l'await.
   */
  async parseWebhook(body /*, headers — non utilisé dans le nouveau modèle */) {
    const txId =
      body?.merchant_transaction_id ||
      body?.data?.merchant_transaction_id;

    if (!txId) {
      logger.warn({ body }, "CinetPay webhook reçu sans merchant_transaction_id");
      return { reference: null, status: "pending", raw: body };
    }

    try {
      const canonical = await this.checkStatus(txId);
      logger.info(
        { txId, status: canonical.status },
        "CinetPay webhook — statut canonique récupéré"
      );
      return {
        reference:   canonical.reference || txId,
        status:      canonical.status,
        external_id: canonical.external_id,
        raw:         canonical.raw,
      };
    } catch (e) {
      // Re-vérification échouée (réseau / API down) → fallback pending.
      // Le cron de réconciliation reprendra plus tard.
      logger.error(
        { txId, err: e.message },
        "CinetPay webhook — re-vérification statut échouée, fallback pending"
      );
      return { reference: txId, status: "pending", raw: body };
    }
  }
}

module.exports = CinetPayProvider;
