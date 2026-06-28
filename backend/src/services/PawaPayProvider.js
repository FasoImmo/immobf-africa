"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * PawaPay — agrégateur mobile money pan-africain (20 pays), utilisé par
 * Canal Box. Couvre le Burkina Faso via Moov Money (`MOOV_BFA`) et Orange
 * Money (`ORANGE_BFA`) — voir docs/PAWAPAY_INTEGRATION.md pour le détail de
 * la recherche (25/06/2026).
 *
 * Différence importante avec CinetPay/FedaPay : un seul token Bearer
 * (pas de site_id/secret séparés), et `ORANGE_BFA` utilise le type
 * d'autorisation PREAUTH (le client doit fournir un code OTP obtenu par
 * USSD avant l'appel API — pas un simple push). `MOOV_BFA` est en
 * PROVIDER_AUTH (push simple, comme les autres providers déjà codés).
 * Tant que le flux OTP Orange n'est pas validé en sandbox, ne pas exposer
 * Orange Money via PawaPay côté UI (voir TODO dans `countries`/registry).
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
   * d'un opérateur logique passé par l'appelant (`metadata.operator` ou
   * déduit du préfixe du numéro). Par défaut Moov (flux simple, pas d'OTP).
   *
   * TODO : ne PAS proposer Orange via PawaPay côté UI jusqu'à validation du
   * flux PREAUTH/OTP en sandbox (voir docs/PAWAPAY_INTEGRATION.md section 1).
   */
  _resolveOperator(metadata) {
    const op = (metadata?.operator || "moov").toLowerCase();
    if (op.includes("orange")) return "ORANGE_BFA";
    return "MOOV_BFA";
  }

  async initiate({ amount, currency = "XOF", reference, customerPhone, metadata }) {
    const { apiToken } = config.providers.pawapay;
    const provider = this._resolveOperator(metadata);

    if (provider === "ORANGE_BFA") {
      throw Object.assign(
        new Error("Orange Money via PawaPay nécessite un code OTP (PREAUTH) — flux non encore validé. Utiliser Moov Money ou un autre fournisseur pour Orange BF."),
        { status: 400, code: "pawapay_orange_preauth_not_supported" }
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
          phoneNumber: String(customerPhone || "").replace(/\D/g, ""),
          provider,
        },
      },
      clientReferenceId: reference,
      amount: String(amount),
      currency,
      metadata: [{ orderId: reference }],
    };

    const res = await fetch(`${this._baseUrl()}/deposits`, {
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
      const err = new Error(`PawaPay initiate failed: ${body?.failureReason?.failureMessage || body.status}`);
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
      reference: body?.metadata?.orderId || body?.clientReferenceId,
      status: body?.status === "COMPLETED" ? "succeeded" : "failed",
      amount: body?.amount ? Number(body.amount) : null,
      currency: body?.currency || "XOF",
      raw: body,
    };
  }
}

module.exports = PawaPayProvider;
