"use strict";
/**
 * BarkaPayProvider — Agrégateur mobile money (Afrique de l'Ouest)
 *
 * Auth   : headers X-Api-Key + X-Api-Secret (aucun token OAuth)
 * Initier: POST /api/client/payment/mobile/api  (multipart/form-data)
 * Statut : GET  /api/client/payment/:public_id
 * IPN    : POST au callback_url (corps JSON)
 *
 * Codes opérateurs : pays ISO-3 (BFA, CIV…) + nom opérateur (MOOV, ORANGE, MTN…)
 * Statuts API      : 0 = en attente, 1 = succès, -1 = échoué
 *
 * Variables d'environnement :
 *   BARKAPAY_API_KEY    — clé API (Dashboard BarkaPay > Intégration API > Créer)
 *   BARKAPAY_API_SECRET — secret API (même endroit)
 *   BARKAPAY_NOTIFY_URL — URL du webhook IPN (ex. https://…/api/payments/webhooks/barkapay)
 *
 * Docs Postman : https://documenter.getpostman.com/view/17495291/2s9YsDjuoj
 */

const PaymentProvider = require("./PaymentProvider");
const config = require("../config");
const logger = require("../utils/logger");

const BASE_URL = "https://api.barkapay.com";

// Carte pays ISO-2 → opérateurs BarkaPay
// code         = valeur envoyée dans `operator` (BarkaPay API attend UPPERCASE)
// country      = valeur envoyée dans `sender_country` (ISO-3)
// otpRequired  = true → flux USSD + OTP (l'app doit demander le code à l'utilisateur)
// ussd         = code USSD à composer pour générer l'OTP
const COUNTRY_OPERATORS = {
  BF: [
    { code: "MOOV",   country: "BFA", label: "Moov Money BF",         otpRequired: false, ussd: null        },
    { code: "ORANGE", country: "BFA", label: "Orange Money BF (OTP)", otpRequired: true,  ussd: "*144*4*6#" },
  ],
  CI: [
    { code: "MTN",    country: "CIV", label: "MTN MoMo CI",           otpRequired: false, ussd: null },
    { code: "MOOV",   country: "CIV", label: "Moov Money CI",         otpRequired: false, ussd: null },
    { code: "ORANGE", country: "CIV", label: "Orange Money CI",       otpRequired: false, ussd: null },
  ],
  SN: [
    { code: "ORANGE", country: "SEN", label: "Orange Money SN",       otpRequired: false, ussd: null },
    { code: "WAVE",   country: "SEN", label: "Wave SN",               otpRequired: false, ussd: null },
    { code: "FREE",   country: "SEN", label: "Free Money SN",         otpRequired: false, ussd: null },
  ],
  BJ: [
    { code: "MTN",    country: "BEN", label: "MTN MoMo BJ",           otpRequired: false, ussd: null },
    { code: "MOOV",   country: "BEN", label: "Moov Money BJ",         otpRequired: false, ussd: null },
  ],
  ML: [
    { code: "ORANGE", country: "MLI", label: "Orange Money ML",       otpRequired: false, ussd: null },
    { code: "MOOV",   country: "MLI", label: "Moov Money ML",         otpRequired: false, ussd: null },
  ],
  TG: [
    { code: "MOOV",   country: "TGO", label: "Moov Money TG",         otpRequired: false, ussd: null },
    { code: "TMONEY", country: "TGO", label: "T-Money TG",            otpRequired: false, ussd: null },
  ],
  GN: [
    { code: "ORANGE", country: "GIN", label: "Orange Money GN",       otpRequired: false, ussd: null },
    { code: "MTN",    country: "GIN", label: "MTN MoMo GN",           otpRequired: false, ussd: null },
  ],
  NE: [
    { code: "AIRTEL", country: "NER", label: "Airtel Money NE",       otpRequired: false, ussd: null },
    { code: "MOOV",   country: "NER", label: "Moov Money NE",         otpRequired: false, ussd: null },
  ],
};

class BarkaPayProvider extends PaymentProvider {
  get name()       { return "barkapay"; }
  get label()      { return "BarkaPay (Moov, Orange, MTN, Wave…)"; }
  get countries()  { return Object.keys(COUNTRY_OPERATORS); }
  get currencies() { return ["XOF", "XAF", "GNF"]; }

  isConfigured() {
    const { apiKey, apiSecret } = config.providers.barkapay ?? {};
    return Boolean(apiKey && apiSecret);
  }

  /**
   * Retourne les opérateurs disponibles pour un pays ISO-2 donné (pour l'UI).
   * Format aligné sur PawaPayProvider.operators() :
   *   { value, label, requiresOtp, ussd }
   * `value` est en minuscules pour être compatible avec le schéma Joi
   * preferred_operator du backend.
   */
  operators(countryCode) {
    return (COUNTRY_OPERATORS[countryCode] || []).map((op) => ({
      value:       op.code.toLowerCase(), // "moov", "orange", "mtn"…
      label:       op.label,
      requiresOtp: op.otpRequired,
      ussd:        op.ussd || null,
    }));
  }

  _headers() {
    const { apiKey, apiSecret } = config.providers.barkapay ?? {};
    return {
      "X-Api-Key":       apiKey,
      "X-Api-Secret":    apiSecret,
      Accept:            "application/json",
      "Accept-Language": "fr",
    };
  }

  // ── Initiation du paiement ────────────────────────────────────────────────
  //
  // payment.metadata doit contenir :
  //   countryCode   — ISO-2 du pays de l'acheteur (ex. "BF")
  //   operator      — code opérateur (ex. "MOOV", "ORANGE")
  //   otp           — (optionnel) code OTP pour ORANGE BF
  async initiate(payment) {
    if (!this.isConfigured()) {
      if (process.env.NODE_ENV !== "production") {
        logger.warn({ reference: payment.reference }, "BarkaPayProvider stub — succès auto (clés absentes)");
        return { status: "succeeded", payment_url: null, external_id: payment.reference, raw: {} };
      }
      throw Object.assign(
        new Error("BarkaPay non configuré (BARKAPAY_API_KEY / BARKAPAY_API_SECRET manquants)."),
        { status: 500, code: "barkapay_not_configured" }
      );
    }

    // Résoudre opérateur
    // metadata.country_code et metadata.operator sont transmis par paymentsController.
    // metadata.preAuthorisationCode correspond au champ pawapay_otp du body (réutilisé pour BarkaPay).
    const countryCode  = payment.metadata?.country_code || payment.metadata?.countryCode || "BF";
    const operatorCode = (payment.metadata?.operator || "moov").toLowerCase();
    const otp          = payment.metadata?.preAuthorisationCode || null;

    const countryOps = COUNTRY_OPERATORS[countryCode.toUpperCase()] || COUNTRY_OPERATORS.BF;
    // Cherche par code (insensible à la casse) ; sinon premier opérateur du pays
    const opInfo = countryOps.find((o) => o.code.toLowerCase() === operatorCode) || countryOps[0];

    const callbackUrl =
      config.providers.barkapay.notifyUrl ||
      `${config.appUrl}/api/payments/webhooks/barkapay`;

    // FormData encodé en application/x-www-form-urlencoded (multipart/form-data
    // aussi accepté ; URLSearchParams = plus simple côté Node)
    // BarkaPay exige un order_id ENTIER NUMÉRIQUE (UUID rejeté).
    // On utilise Date.now() comme ID court unique ; la réconciliation passe
    // par external_id (public_id BarkaPay) → findByExternalId() en fallback.
    const numericOrderId = String(Date.now());
    // order_id_unicity : 1 = vrai, 0 = faux (BarkaPay rejette "true"/"false").
    const form = new URLSearchParams();
    form.append("sender_country",     opInfo.country);
    form.append("operator",           opInfo.code.toUpperCase()); // BarkaPay API attend UPPERCASE
    form.append("sender_phonenumber", String(payment.customerPhone || "").replace(/\D/g, ""));
    form.append("amount",             String(Math.round(payment.amount)));
    form.append("order_id",           numericOrderId);
    form.append("order_id_unicity",   "1");
    form.append("callback_url",       callbackUrl);
    if (payment.description) {
      form.append("order_data", JSON.stringify({ description: payment.description }));
    }
    if (otp) form.append("otp", otp);

    const res = await fetch(`${BASE_URL}/api/client/payment/mobile/api`, {
      method:  "POST",
      headers: { ...this._headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body:    form.toString(),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = body.message || `HTTP ${res.status}`;
      logger.error({ reference: payment.reference, status: res.status, body }, "BarkaPay initiate failed");
      throw Object.assign(
        new Error(`BarkaPay: ${msg}`),
        { status: 502, code: "barkapay_initiate_failed", raw: body }
      );
    }

    const data       = body.data || body;
    const publicId   = data.public_id;
    const bpStatus   = typeof data.status !== "undefined" ? data.status : 0;
    const normalized = this._normalizeStatus(bpStatus);

    logger.info({ reference: payment.reference, publicId, bpStatus }, "BarkaPay paiement initié");

    // Si ORANGE BF sans OTP fourni : le client doit composer USSD pour obtenir
    // un OTP, puis rappeler l'endpoint avec l'OTP dans payment.metadata.otp.
    let otpRequired     = false;
    let otpInstructions = null;
    if (opInfo.otpRequired && !otp) {
      otpRequired     = true;
      otpInstructions = `Composez le code USSD ${opInfo.label} pour générer votre OTP, puis saisissez-le pour finaliser le paiement.`;
      logger.info({ reference: payment.reference, operator: opInfo.code }, "BarkaPay OTP requis");
    }

    return {
      status:          normalized,
      payment_url:     null,
      external_id:     publicId || payment.reference,
      otpRequired,
      otpInstructions,
      raw:             body,
    };
  }

  // ── Vérification du statut ────────────────────────────────────────────────
  async checkStatus(externalId) {
    if (!this.isConfigured() || !externalId) return null;

    const res = await fetch(`${BASE_URL}/api/client/payment/${encodeURIComponent(externalId)}`, {
      method:  "GET",
      headers: this._headers(),
    });
    if (!res.ok) return null;

    const body = await res.json().catch(() => null);
    if (!body) return null;

    // L'API FINDER retourne un tableau
    const entry = Array.isArray(body) ? body[0] : (body.data?.[0] ?? body.data ?? body);
    if (!entry) return null;

    return {
      reference:   entry.order_id,
      status:      this._normalizeStatus(entry.status),
      external_id: entry.public_id ?? externalId,
      raw:         body,
    };
  }

  _normalizeStatus(s) {
    if (s === 1  || s === "1")  return "succeeded";
    if (s === -1 || s === "-1") return "failed";
    return "pending";
  }

  // ── Webhook IPN ───────────────────────────────────────────────────────────
  // Corps JSON : { public_id, amount, sender_phonenumber, status, order_id, txid, … }
  // On re-vérifie toujours via FINDER pour éviter de se fier uniquement à l'IPN.
  verifyWebhookSignature(_headers, _rawBody) {
    // BarkaPay ne signe pas encore les IPN — pas de vérification HMAC.
    // TODO : ajouter un secret partagé (ex. ?secret=BARKAPAY_WEBHOOK_SECRET)
    // lorsque BarkaPay le supportera.
    return true;
  }

  async parseWebhook(body) {
    const publicId = body?.public_id;
    const orderId  = body?.order_id;

    if (!publicId && !orderId) {
      logger.warn({ body }, "BarkaPay IPN sans public_id ni order_id");
      return { reference: null, status: "pending", raw: body };
    }

    // Re-vérification via FINDER (source de vérité)
    if (publicId) {
      try {
        const canonical = await this.checkStatus(publicId);
        if (canonical) {
          logger.info({ publicId, status: canonical.status }, "BarkaPay IPN — statut FINDER");
          return {
            reference:   canonical.reference || orderId,
            status:      canonical.status,
            external_id: publicId,
            raw:         canonical.raw,
          };
        }
      } catch (e) {
        logger.warn({ publicId, err: e.message }, "BarkaPay IPN — re-vérif FINDER échouée, fallback IPN");
      }
    }

    // Fallback sur le statut brut de l'IPN
    return {
      reference:   orderId,
      status:      this._normalizeStatus(body?.status),
      external_id: publicId,
      raw:         body,
    };
  }
}

module.exports = BarkaPayProvider;
