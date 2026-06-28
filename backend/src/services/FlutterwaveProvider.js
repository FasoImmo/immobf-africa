"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * Flutterwave — agrégateur panafricain (Nigeria, Ghana, Kenya, Afrique de
 * l'Ouest francophone...).
 *
 * Pourquoi Flutterwave (en complément/alternative à FedaPay/PayDunya) :
 *   - Plateforme internationale très utilisée, documentation stable.
 *   - Carte bancaire (Visa/Mastercard) + mobile money Orange Money et
 *     Mobicash au Burkina Faso, contrairement à FedaPay dont le compte Live
 *     ne propose actuellement aucun canal fonctionnel pour le BF.
 *   - PAS de support Moov Money BF à ce jour côté Flutterwave — à garder en
 *     tête, FedaPay/PayDunya restent à débloquer pour cet opérateur.
 *
 * Docs API :
 *   - https://developer.flutterwave.com/docs/flutterwave-standard
 *   - https://developer.flutterwave.com/docs/integration-guides/webhooks
 *
 * Authentification : `Authorization: Bearer <FLUTTERWAVE_SECRET_KEY>`
 *   FLWSECK-...-X (clé live) ou FLWSECK_TEST-...-X (clé test).
 *
 * Flow standard :
 *   1. POST /v3/payments -> { status:"success", data:{ link } }
 *   2. Redirection client vers `link` (page hébergée Flutterwave : carte,
 *      Orange Money, Mobicash, etc. selon configuration du compte).
 *   3. Flutterwave POST notre webhook (header `verif-hash`) à la fin du
 *      paiement, ET redirige le client vers `redirect_url` avec
 *      `?status=successful&tx_ref=...&transaction_id=...` en query string.
 */
class FlutterwaveProvider extends PaymentProvider {
  get name() { return "flutterwave"; }

  // BF en tête car c'est notre marché principal. CI/SN/TG/NE/BJ/ML/GN
  // couverts aussi pour rester cohérent avec FedaPay/PayDunya, à valider
  // au cas par cas selon les canaux réellement actifs sur le compte.
  get countries() { return ["BF", "CI", "SN", "TG", "NE", "BJ", "ML", "GN"]; }

  get currencies() { return ["XOF"]; }

  isConfigured() {
    return Boolean(config.providers.flutterwave.secretKey);
  }

  _baseUrl() {
    return "https://api.flutterwave.com/v3";
  }

  async initiate({
    amount,
    currency = "XOF",
    reference,
    customerPhone,
    customerEmail,
    customerName,
    description,
  }) {
    const { secretKey } = config.providers.flutterwave;
    const logger = require("../utils/logger");

    // Stub mode : pas de clé -> erreur si on attend de vrais paiements,
    // succès simulé seulement en dev local explicite. Même garde-fou que
    // FedaPayProvider/WaveProvider pour ne jamais afficher un faux succès
    // en production.
    if (!secretKey) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("FLUTTERWAVE_SECRET_KEY manquant alors que des paiements réels sont attendus (NODE_ENV=production). Paiement refusé pour éviter une fausse confirmation."),
          { status: 500, code: "flutterwave_not_configured" }
        );
      }
      logger.warn({ reference }, "Flutterwave stub mode actif (clé absente, environnement de dev) — paiement auto-validé sans appel réel");
      return {
        external_id: `flw_stub_${reference}`,
        status: "succeeded",
        payment_url: null,
        raw: { stub: true, note: "FLUTTERWAVE_SECRET_KEY not set — auto-succeeded" },
      };
    }

    const txPayload = {
      tx_ref: reference,
      amount: String(amount),
      currency,
      redirect_url: `${config.webUrl}/payment/callback?ref=${reference}`,
      customer: {
        email: customerEmail || `noreply+${reference}@immobf.africa`,
        phonenumber: customerPhone,
        name: customerName || "Client",
      },
      customizations: {
        title: "ImmoBF Africa",
        description: description || "Paiement ImmoBF Africa",
      },
      meta: { reference },
    };

    const res = await fetch(`${this._baseUrl()}/payments`, {
      method: "POST",
      headers: this._authHeaders(secretKey),
      body: JSON.stringify(txPayload),
    });
    const body = await res.json();
    if (!res.ok || body?.status !== "success" || !body?.data?.link) {
      logger.error({
        flutterwave_http_status: res.status,
        flutterwave_response_body: body,
      }, "Flutterwave payment initiation failed");
      const err = new Error(`Flutterwave init failed: ${body?.message || res.status}`);
      err.raw = body;
      throw err;
    }

    return {
      external_id: reference, // tx_ref ; l'id numérique Flutterwave n'arrive qu'au webhook/callback
      status: "pending",
      payment_url: body.data.link,
      raw: body,
    };
  }

  /**
   * Webhook Flutterwave : pas de HMAC, juste une comparaison du header
   * `verif-hash` avec le "secret hash" configuré dans le dashboard
   * Flutterwave (Settings > Webhooks). Comparaison en temps constant pour
   * éviter le timing attack, même si ce n'est pas un HMAC à proprement parler.
   *
   * https://developer.flutterwave.com/docs/integration-guides/webhooks
   */
  verifyWebhookSignature(headers, _rawBody) {
    const { webhookHash } = config.providers.flutterwave;
    if (!webhookHash) return true; // stub mode

    const header = headers["verif-hash"] || headers["Verif-Hash"] || "";
    if (!header) return false;
    return safeEqual(header, webhookHash);
  }

  /**
   * Payload typique :
   *   {
   *     "event": "charge.completed",
   *     "data": {
   *       "id": 12345, "tx_ref": "IMO-...", "flw_ref": "...",
   *       "amount": 2000, "currency": "XOF", "status": "successful",
   *       "meta": { "reference": "IMO-..." }
   *     }
   *   }
   */
  parseWebhook(body) {
    const data = body?.data || {};
    const status = mapFlutterwaveStatus(data.status || body?.event);
    return {
      external_id: data.id != null ? String(data.id) : undefined,
      reference: data?.meta?.reference || data.tx_ref,
      status,
      amount: data.amount != null ? Number(data.amount) : null,
      currency: data.currency || "XOF",
      raw: body,
    };
  }

  async refund({ externalId }) {
    const { secretKey } = config.providers.flutterwave;
    if (!secretKey) {
      return { status: "refunded", external_id: externalId, raw: { stub: true } };
    }
    const res = await fetch(`${this._baseUrl()}/transactions/${externalId}/refund`, {
      method: "POST",
      headers: this._authHeaders(secretKey),
    });
    const body = await res.json();
    if (!res.ok) {
      const err = new Error(`Flutterwave refund failed: ${body?.message || res.status}`);
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
}

function mapFlutterwaveStatus(s) {
  switch (String(s)) {
    case "successful":
    case "charge.completed":
      return "succeeded";
    case "failed":
      return "failed";
    case "cancelled":
      return "failed";
    case "pending":
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

module.exports = FlutterwaveProvider;
