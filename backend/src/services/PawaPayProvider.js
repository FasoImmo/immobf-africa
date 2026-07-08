"use strict";

const crypto = require("crypto");
const PaymentProvider = require("./PaymentProvider");
const config = require("../config");

/**
 * PawaPay — agrégateur mobile money pan-africain (30+ pays africains).
 * Inscription self-service, pas de barrière pays pour les marchands.
 *
 * Auth types :
 *  - PROVIDER_AUTH : le client reçoit une notification push sur son téléphone
 *    et valide (flux simple, rien à saisir côté client).
 *  - PREAUTH       : le client doit d'abord composer un code USSD chez son
 *    opérateur pour générer un OTP (avec son code secret), puis saisir cet
 *    OTP dans le formulaire de paiement. Rare — uniquement ORANGE_BFA à ce
 *    jour dans notre marché principal.
 *
 * Docs : https://docs.pawapay.io/v2/docs/welcome
 * API base sandbox : https://api.sandbox.pawapay.io
 * API base prod    : https://api.pawapay.io
 */

// ─── Carte pays → opérateurs PawaPay ─────────────────────────────────────────
// Chaque entrée : { name (clé UI), code (code PawaPay), label (affiché), auth }
// Source : docs.pawapay.io/v2/docs/country-availability
const COUNTRY_OPERATORS = {
  // ── UEMOA ──────────────────────────────────────────────────────────────────
  BF: [
    { name: "moov",   code: "MOOV_BFA",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
    { name: "orange", code: "ORANGE_BFA",  label: "Orange Money (OTP)",  auth: "PREAUTH" },
  ],
  CI: [
    { name: "mtn",    code: "MTN_MOMO_CIV", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "moov",   code: "MOOV_CIV",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
    { name: "orange", code: "ORANGE_CIV",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
  ],
  SN: [
    { name: "orange", code: "ORANGE_SEN",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
    { name: "free",   code: "FREE_SEN",    label: "Free Money",          auth: "PROVIDER_AUTH" },
    { name: "wave",   code: "WAVE_SEN",    label: "Wave",                auth: "PROVIDER_AUTH" },
  ],
  ML: [
    { name: "orange", code: "ORANGE_MLI",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
    { name: "moov",   code: "MOOV_MLI",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
  ],
  TG: [
    { name: "moov",   code: "MOOV_TGO",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
    { name: "togocel",code: "TOGOCEL_TGO", label: "T-Money (Togocel)",   auth: "PROVIDER_AUTH" },
  ],
  BJ: [
    { name: "mtn",    code: "MTN_MOMO_BEN", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "moov",   code: "MOOV_BEN",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
  ],
  GN: [
    { name: "orange", code: "ORANGE_GIN",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
    { name: "mtn",    code: "MTN_MOMO_GIN", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
  ],
  NE: [
    { name: "airtel", code: "AIRTEL_NER",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
  ],
  // ── CEMAC ──────────────────────────────────────────────────────────────────
  CM: [
    { name: "orange", code: "ORANGE_CMR",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
    { name: "mtn",    code: "MTN_MOMO_CMR", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
  ],
  TD: [
    { name: "airtel", code: "AIRTEL_TCD",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "moov",   code: "MOOV_TCD",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
  ],
  CG: [
    { name: "airtel", code: "AIRTEL_COG",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "mtn",    code: "MTN_MOMO_COG", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
  ],
  CD: [
    { name: "airtel", code: "AIRTEL_COD",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "orange", code: "ORANGE_COD",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
    { name: "mpesa",  code: "MPESA_COD",   label: "M-Pesa",              auth: "PROVIDER_AUTH" },
  ],
  GA: [
    { name: "airtel", code: "AIRTEL_GAB",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "moov",   code: "MOOV_GAB",    label: "Moov Money",          auth: "PROVIDER_AUTH" },
  ],
  // ── Afrique de l'Ouest anglophone ──────────────────────────────────────────
  GH: [
    { name: "mtn",    code: "MTN_MOMO_GHA", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "vodafone", code: "VODAFONE_GHA", label: "Vodafone Cash",   auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_TIGO_GHA", label: "AirtelTigo",     auth: "PROVIDER_AUTH" },
  ],
  SL: [
    { name: "orange", code: "ORANGE_SLE",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
  ],
  LR: [
    { name: "orange", code: "ORANGE_LBR",  label: "Orange Money",        auth: "PROVIDER_AUTH" },
  ],
  // ── Afrique de l'Est ───────────────────────────────────────────────────────
  TZ: [
    { name: "vodacom", code: "VODACOM_TZA", label: "M-Pesa (Vodacom)",  auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_TZA",  label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "tigo",   code: "TIGO_TZA",    label: "Tigo Pesa",           auth: "PROVIDER_AUTH" },
    { name: "halotel", code: "HALOTEL_TZA", label: "HaloPesa",           auth: "PROVIDER_AUTH" },
  ],
  UG: [
    { name: "mtn",    code: "MTN_MOMO_UGA", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_UGA",   label: "Airtel Money",       auth: "PROVIDER_AUTH" },
  ],
  RW: [
    { name: "mtn",    code: "MTN_MOMO_RWA", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_RWA",   label: "Airtel Money",       auth: "PROVIDER_AUTH" },
  ],
  MG: [
    { name: "mvola",  code: "MVOLA_MDG",    label: "MVola (Telma)",       auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_MDG",   label: "Airtel Money",        auth: "PROVIDER_AUTH" },
  ],
  // ── Afrique Australe ───────────────────────────────────────────────────────
  ZM: [
    { name: "mtn",    code: "MTN_MOMO_ZMB", label: "MTN MoMo",          auth: "PROVIDER_AUTH" },
    { name: "airtel", code: "AIRTEL_ZMB",   label: "Airtel Money",       auth: "PROVIDER_AUTH" },
  ],
  MZ: [
    { name: "mpesa",  code: "MPESA_MOZ",    label: "M-Pesa",              auth: "PROVIDER_AUTH" },
    { name: "vodacom", code: "VODACOM_MOZ", label: "Vodacom M-Pesa",     auth: "PROVIDER_AUTH" },
  ],
  MW: [
    { name: "airtel", code: "AIRTEL_MWI",   label: "Airtel Money",        auth: "PROVIDER_AUTH" },
    { name: "tnm",    code: "TNM_MWI",      label: "TNM Mpamba",          auth: "PROVIDER_AUTH" },
  ],
  ZW: [
    { name: "ecocash", code: "ECOCASH_ZWE", label: "EcoCash",             auth: "PROVIDER_AUTH" },
  ],
};

// ─── Indicatifs internationaux (pour normalisation numéro de téléphone) ───────
const COUNTRY_DIAL = {
  BF: "226", CI: "225", SN: "221", ML: "223", TG: "228",
  BJ: "229", GN: "224", NE: "227", GW: "245", MR: "222",
  CM: "237", TD: "235", CG: "242", CD: "243", GA: "241",
  GH: "233", SL: "232", LR: "231",
  TZ: "255", UG: "256", RW: "250", KE: "254", MG: "261",
  ZM: "260", MZ: "258", MW: "265", ZW: "263",
};

class PawaPayProvider extends PaymentProvider {
  get name() { return "pawapay"; }

  /** Liste de tous les pays couverts, dérivée dynamiquement de la carte. */
  get countries() { return Object.keys(COUNTRY_OPERATORS); }

  get currencies() {
    return ["XOF", "GHS", "TZS", "UGX", "RWF", "ZMW", "MZN", "MWK", "ZWL", "CDF", "XAF"];
  }

  isConfigured() {
    return Boolean(config.providers.pawapay.apiToken);
  }

  _baseUrl() {
    return config.providers.pawapay.live
      ? "https://api.pawapay.io"
      : "https://api.sandbox.pawapay.io";
  }

  /**
   * Retourne la liste des opérateurs disponibles pour un pays, formatée pour
   * l'affichage dans l'UI (PaymentDialog / PaymentScreen).
   */
  operators(countryCode) {
    return (COUNTRY_OPERATORS[countryCode] || []).map((op) => ({
      value:       op.name,
      label:       op.label,
      requiresOtp: op.auth === "PREAUTH",
    }));
  }

  /**
   * Résout le code opérateur PawaPay (ex. "MOOV_BFA") à partir du nom
   * logique (ex. "moov") et du code pays (ex. "BF").
   * Retourne l'entrée complète (avec auth type).
   */
  _resolveOperatorEntry(operatorName, countryCode) {
    const ops = COUNTRY_OPERATORS[countryCode] || [];
    const found = ops.find((o) => o.name === (operatorName || "").toLowerCase());
    // Fallback : premier opérateur du pays (PROVIDER_AUTH de préférence)
    return found || ops.find((o) => o.auth === "PROVIDER_AUTH") || ops[0];
  }

  /**
   * Normalise le numéro de téléphone en format MSISDN international (sans "+").
   * Ex : "70123456" (BF) → "22670123456"
   *      "+22670123456" → "22670123456"
   */
  _normalizePhone(customerPhone, countryCode = "BF") {
    let digits = String(customerPhone || "").replace(/\D/g, "");
    // Supprimer le zéro de tête (format local)
    digits = digits.replace(/^0+/, "");
    const dialCode = COUNTRY_DIAL[countryCode] || COUNTRY_DIAL.BF;
    if (!digits.startsWith(dialCode)) {
      digits = `${dialCode}${digits}`;
    }
    return digits;
  }

  /**
   * Interroge l'API PawaPay pour connaître le statut actuel d'un dépôt.
   * Utilisé par le cron de réconciliation pour les transactions restées pending.
   * @returns {"succeeded"|"failed"|null} null = toujours en cours ou erreur réseau
   */
  async checkStatus(depositId) {
    const { apiToken } = config.providers.pawapay;
    if (!apiToken || !depositId) return null;
    try {
      const res  = await fetch(`${this._baseUrl()}/v2/deposits/${depositId}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) return null;
      const body = await res.json();
      // CORRECTIF (#181) : l'API PawaPay GET /deposits/{id} renvoie un tableau
      // [{ depositId, status, ... }] et non un objet direct — body.status était
      // donc undefined, checkStatus renvoyait null à chaque poll, et le dialog
      // restait en attente indéfiniment même après validation par SMS.
      const deposit = Array.isArray(body) ? body[0] : body;
      // Statuts PawaPay : ACCEPTED (en cours) | COMPLETED | FAILED | EXPIRED
      if (deposit?.status === "COMPLETED") return "succeeded";
      if (deposit?.status === "FAILED" || deposit?.status === "EXPIRED") return "failed";
      return null; // ACCEPTED = toujours en attente
    } catch (_) {
      return null; // erreur réseau — ne pas marquer failed
    }
  }

  async initiate({ amount, currency = "XOF", reference, customerPhone, metadata }) {
    const { apiToken } = config.providers.pawapay;
    const countryCode = metadata?.country_code || "BF";
    const operatorEntry = this._resolveOperatorEntry(metadata?.operator, countryCode);

    if (!operatorEntry) {
      throw Object.assign(
        new Error(`PawaPay : aucun opérateur disponible pour le pays ${countryCode}`),
        { status: 400, code: "pawapay_no_operator" }
      );
    }

    // PREAUTH (ex. ORANGE_BFA) : code OTP obligatoire
    const preAuthorisationCode = metadata?.preAuthorisationCode;
    if (operatorEntry.auth === "PREAUTH" && !preAuthorisationCode) {
      throw Object.assign(
        new Error(`${operatorEntry.label} nécessite un code OTP généré par le client via le service USSD (flux PREAUTH).`),
        { status: 400, code: "pawapay_preauth_code_required" }
      );
    }

    // Mode dev sans token — stub (jamais en production)
    if (!apiToken) {
      if (process.env.NODE_ENV === "production") {
        throw Object.assign(
          new Error("PawaPay non configuré (PAWAPAY_API_TOKEN manquant) — paiement refusé en production."),
          { status: 500, code: "pawapay_not_configured" }
        );
      }
      const logger = require("../utils/logger");
      logger.warn({ reference }, "PawaPay stub mode (dev) — paiement auto-validé sans appel réel");
      return { external_id: `pp_stub_${reference}`, status: "succeeded", payment_url: null, raw: { stub: true } };
    }

    const depositId = crypto.randomUUID();
    const payload = {
      depositId,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: this._normalizePhone(customerPhone, countryCode),
          provider: operatorEntry.code,
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

    const res = await fetch(`${this._baseUrl()}/v2/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json();

    if (body.status !== "ACCEPTED") {
      const logger = require("../utils/logger");
      logger.error({
        pawapay_http_status: res.status,
        pawapay_response_body: body,
        pawapay_request_payload: payload,
      }, "PawaPay deposit initiation failed");
      const err = new Error(
        `PawaPay initiate failed: ${body?.failureReason?.failureMessage || body?.status || body?.message || JSON.stringify(body)}`
      );
      err.raw = body;
      throw err;
    }

    return { external_id: body.depositId, status: "pending", payment_url: null, raw: body };
  }

  /** Les callbacks PawaPay ne sont pas signés par défaut (signature RFC-9421
   *  optionnelle — à activer dans le dashboard si besoin). */
  verifyWebhookSignature(_headers, _rawBody) { return true; }

  parseWebhook(body) {
    return {
      external_id: body?.depositId,
      reference:   body?.metadata?.[0]?.orderId || body?.clientReferenceId,
      status:      body?.status === "COMPLETED" ? "succeeded" : "failed",
      amount:      body?.amount ? Number(body.amount) : null,
      currency:    body?.currency || "XOF",
      raw:         body,
    };
  }
}

module.exports = PawaPayProvider;
