"use strict";

/**
 * Interface abstraite que chaque opérateur de paiement doit implémenter.
 * Pour ajouter MTN MoMo, Flooz, M-Pesa, Airtel Money, etc. :
 *   1. Étendre cette classe.
 *   2. Implémenter les 4 méthodes ci-dessous.
 *   3. Enregistrer l'instance dans PaymentProviderRegistry.
 */
class PaymentProvider {
  /** Identifiant court, ex: "orange_money_bf", "cinetpay", "wave". */
  get name() { throw new Error("abstract"); }

  /** Codes ISO pays supportés, ex: ["BF"] ou ["BF","CI","SN"]. */
  get countries() { throw new Error("abstract"); }

  /** Devises supportées, ex: ["XOF"]. */
  get currencies() { return ["XOF"]; }

  /**
   * Vrai si les identifiants/clés API nécessaires sont présents en config.
   * Sert à filtrer la liste des moyens de paiement affichés côté UI : on ne
   * propose à l'utilisateur que des fournisseurs réellement opérationnels,
   * pour éviter un choix qui échouera systématiquement ("non configuré").
   * Par défaut true ; chaque provider doit surcharger avec sa propre logique.
   */
  isConfigured() { return true; }

  /**
   * Lance un paiement côté opérateur.
   * @returns {Promise<{external_id:string, status:string, payment_url?:string, ussd_code?:string, raw:any}>}
   */
  async initiate(_input) { throw new Error("abstract"); }

  /** Vérifie la signature/HMAC d'un webhook. Renvoie booléen. */
  verifyWebhookSignature(_headers, _rawBody) { throw new Error("abstract"); }

  /** Parse un payload webhook en format canonique. */
  parseWebhook(_body) { throw new Error("abstract"); }

  /** (Optionnel) Remboursement. */
  async refund(_input) { throw new Error("refund not supported"); }
}

module.exports = PaymentProvider;
