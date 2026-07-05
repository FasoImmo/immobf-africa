"use strict";

const CinetPay = require("./CinetPayProvider");
const OrangeMoney = require("./OrangeMoneyProvider");
const MoovMoney = require("./MoovMoneyProvider");
const Wave = require("./WaveProvider");
const FedaPay = require("./FedaPayProvider");
const PayDunya = require("./PayDunyaProvider");
const Flutterwave = require("./FlutterwaveProvider");
const PawaPay = require("./PawaPayProvider");

// Ordre = ordre d'affichage côté UI (premier = recommandé par défaut).
//
// CORRECTIF (19/06/2026) : Wave ET Flutterwave ont tous les deux été testés
// et REJETTENT l'inscription marchand pour une entreprise basée au Burkina
// Faso (vérifié via leurs formulaires d'inscription réels — captures
// d'écran utilisateur, pas seulement la doc marketing) :
//   - Flutterwave : "Contact Sales" ne liste pas le BF parmi les pays.
//   - Wave Business : le formulaire d'inscription (forms.monday.com) ne
//     propose que Côte d'Ivoire / Sénégal / Gambia comme pays d'activité.
// Ces deux agrégateurs restent codés et utilisables si un compte devient un
// jour accessible (autre pays UEMOA, ou évolution de leur couverture), mais
// ne sont PLUS la priorité d'affichage pour le Burkina Faso.
//
// CinetPay et Orange Money BF passent en tête car ce sont les deux seules
// options qui n'ont pas cette barrière d'inscription "entreprise étrangère" :
//   - CinetPay : agrégateur nativement conçu pour l'Afrique francophone
//     (BF/CI/SN/ML/TG/BJ/CM), pas de restriction pays constatée. Relance
//     commerciale en cours (voir tâche #28).
//   - Orange Money BF : relation directe avec l'opérateur télécom présent
//     au Burkina Faso (pas un agrégateur tiers) — pas de barrière
//     d'inscription "pays" attendue. Compte marchand à demander (tâche #27).
// FedaPay/PayDunya restent en attente côté support (carte + opérateurs BF
// absents — voir tâche #24). Moov Money BF direct utilise un endpoint non
// vérifié — CinetPay reste le canal recommandé pour cet opérateur en attendant.
const instances = {
  cinetpay:       new CinetPay(),
  orange_money_bf: new OrangeMoney(),
  wave:           new Wave(),
  flutterwave:    new Flutterwave(),
  fedapay:        new FedaPay(),
  paydunya:       new PayDunya(),
  moov_money_bf:  new MoovMoney(),
  // PawaPay (25/06/2026, OTP Orange ajouté le 30/06/2026) : option BF
  // complémentaire à CinetPay, inscription self-service (pas de barrière
  // pays). N'apparaîtra côté UI que lorsque PAWAPAY_API_TOKEN sera configuré
  // (isConfigured()). Moov Money = push simple ; Orange Money = le client
  // doit saisir un code OTP généré via USSD (flux PREAUTH, voir
  // PawaPayProvider.js).
  pawapay:        new PawaPay(),
};

function get(name) {
  const p = instances[name];
  if (!p) throw Object.assign(new Error(`Unknown payment provider: ${name}`), { status: 400, code: "unknown_provider" });
  return p;
}

function listForCountry(countryCode) {
  return Object.values(instances)
    .filter((p) => p.countries.includes(countryCode))
    // On ne propose à l'utilisateur que les fournisseurs réellement
    // configurés (clés API présentes) — sinon le choix est trompeur :
    // il mène systématiquement à "non configuré, paiement refusé".
    .filter((p) => p.isConfigured())
    .map((p) => ({
      name: p.name,
      countries: p.countries,
      currencies: p.currencies,
      // Opérateurs disponibles pour ce pays (ex. PawaPay → Moov + Orange)
      // undefined si le provider ne supporte pas la sélection d'opérateur.
      ...(typeof p.operators === "function" ? { operators: p.operators(countryCode) } : {}),
    }));
}

function all() {
  return Object.keys(instances);
}

module.exports = { get, listForCountry, all };
