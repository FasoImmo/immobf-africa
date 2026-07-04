"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * PawaPay — agrégateur mobile money pan-africain (20 pays), utilisé par
 * Canal Box. Couvre le Burkina Faso via Moov Money (`MOOV_BFA`) et Orange
 * Money (`ORANGE_BFA`).
 *
 * Différence importante avec CinetPay/FedaPay : un seul token Bearer
 * (pas de site_id/secret séparés), et `ORANGE_BFA` utilise le type
 * d'autorisation PREAUTH (confirmé dans la doc officielle PawaPay,
 * 30/06/2026 : table des providers, section Burkina Faso) — le client doit
 * d'abord composer un code USSD Orange Money pour générer lui-même un code
 * OTP (avec son code secret Orange Money), puis ce code est transmis tel
 * quel dans `preAuthorisationCode`. `MOOV_BFA` reste en PROVIDER_AUTH
 * (push simple, pas de code à saisir).
 *
 * Pas de paiement carte (mobile money uniquement).
 *
 * Docs: https://docs.pawapay.io/v2/docs/welcome
 * API base sandbox: https://api.sandbox.pawapay.io
 * API base prod: https://api.pawapay.io
 */
class PawaPayProvider extends PaymentProvider {
  get name() { return "pawapay"; }
  get countries() { return ["BF"]; }
  get currencies() { return ["XOF"]; }

  isConfigured() {
    const { apiToken } = config.providers.pawapay;
    return Boolean(apiToken);
  }

  _baseUrl() {
    return config.providers.pawapay.live
      ? "https://api.pawapay.io"
      : "https://api.sandbox.pawapay.io";
  }

  /**
   * Détermine le code provider PawaPay (`MOOV_BFA` / `ORANGE_BFA`) à partir
   * d'un opérateur logique passé par l'appelant (`metadata.operator`).
   * Par défaut Moov (flux simple, pas d'OTP requis).
   */
  _resolveOperator(metadata) {
    const op = (metadata?.operator || "moov").toLowerCase();
    if (op.includes("orange")) return "ORANGE_BFA";
    return "MOOV_BFA";
  }

  /**
   * CORRECTIF (29/06/2026) : PawaPay exige un MSISDN complet avec
   * indicatif pays (ex. "22670123456"), sans "+". Le formulaire de
   * checkout ne fait saisir que le numéro local (8 chiffres, ex.
   * "70123456" ou "070123456"), d'où l'erreur "The MSISDN is too short".
   * On retire un éventuel zéro initial puis on préfixe par "226" (BF)
   * si l'indicatif n'est pas déjà présent.
   */
  _normalizePhone(customerPhone) {
    let digits = String(customerPhone || "").replace(/\D/g, "");
    digits = digits.replace(/^0+/, "");
    if (!digits.startsWith("226")) {
      digits = `226${digits}`;
    }
    return digits;
  }

  async initiate({ amount, currency = "XOF", reference, customerPhone, metadata }) {
    const { apiToken } = config.providers.pawapay;
    const provider = this._resolveOperator(metadata);

    // ORANGE_BFA est en authentification PREAUTH : le client doit avoir
    // généré un code OTP via le service USSD Orange Money (avec son code
    // secret) AVANT l'appel — ce code est obligatoire dans la requête, sans
    // lui PawaPay rejette le dépôt avec MISSING_PARAMETER.
    const preAuthorisationCode = metadata?.preAuthorisationCode;
    if (provider === "ORANGE_BFA" && !preAuthorisationCode) {
      throw Object.assign(
        new Error("Orange Money via PawaPay nécessite le code OTP généré par le client via le service USSD Orange Money (PREAUTH)."),
        { status: 400, code: "pawapay_orange_preauth_code_required" }
      );
    }

    // Pour le MVP / dev sans secrets : on simule la réponse, jamais en prod.
    if (!apiToken) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("PawaPay non configuré (token manquant) — paiement refusé en production."),
          { status: 500, code: "pawapay_not_configured" }
        );
      }
      const logger = require("../utils/logger");
      logger.warn({ reference }, "PawaPay stub mode (dev) — paiement auto-validé sans appel réel");
      return {
        external_id: `pp_stub_${reference}`,
        status: "succeeded",
        payment_url: null,
        raw: { stub: true },
      };
    }

    const depositId = crypto.randomUUID();
    const payload = {
      depositId,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: this._normalizePhone(customerPhone),
          provider,
        },
      },
      clientReferenceId: reference,
      amount: String(amount),
      currency,
      metadata: [{ orderId: reference }],
    };
    if (preAuthorisationCode) {
      payload.preAuthorisationCode = preAuthorisationCode;
    }

    // CORRECTIF (29/06/2026) : l'API Merchant est versionnée — l'ancien
    // chemin "/deposits" tape sur un endpoint qui renvoie un format d'erreur
    // générique {errorId, errorCode, errorMessage} ne correspondant PAS au
    // schéma documenté ({status, failureReason: {failureCode, ...}}), signe
    // qu'on ne touchait pas le bon endpoint. Le bon chemin documenté est
    // "/v2/deposits" (voir docs.pawapay.io/v2/api-reference/deposits/initiate-deposit).
    const res = await fetch(`${this._baseUrl()}/v2/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    // ACCEPTED = pris en charge mais PAS encore terminé : le statut final
    // (COMPLETED/FAILED) arrive par callback ou via Check Deposit Status.
    if (body.status !== "ACCEPTED") {
      // DIAGNOSTIC TEMPORAIRE (29/06/2026) : le message d'erreur affichait
      // "undefined" côté UI car ni failureReason.failureMessage ni body.status
      // n'étaient présents — on logue tout pour voir la vraie forme de la
      // réponse PawaPay (ex. erreur de validation 400, token invalide, etc.).
      const logger = require("../utils/logger");
      logger.error({
        pawapay_http_status: res.status,
        pawapay_response_body: body,
        pawapay_base_url: this._baseUrl(),
        pawapay_request_payload: payload,
      }, "PawaPay deposit initiation failed");
      const err = new Error(`PawaPay initiate failed: ${body?.failureReason?.failureMessage || body?.status || body?.message || JSON.stringify(body)}`);
      err.raw = body;
      throw err;
    }
    return {
      external_id: body.depositId,
      status: "pending",
      payment_url: null,
      raw: body,
    };
  }

  /**
   * Callbacks PawaPay ne sont PAS signés par défaut (signature RFC-9421
   * optionnelle, à activer dans le dashboard si besoin — implémentation plus
   * lourde qu'un simple HMAC, voir docs/PAWAPAY_INTEGRATION.md section 3).
   * Pour le MVP, on accepte tout callback (à durcir plus tard si activé).
   */
  verifyWebhookSignature(_headers, _rawBody) {
    return true;
  }

  parseWebhook(body) {
    return {
      external_id: body?.depositId,
      reference: body?.metadata?.[0]?.orderId || body?.clientReferenceId,
      status: body?.status === "COMPLETED" ? "succeeded" : "failed",
      amount: body?.amount ? Number(body.amount) : null,
      currency: body?.currency || "XOF",
      raw: body,
    };
  }
}

module.exports = PawaPayProvider;
