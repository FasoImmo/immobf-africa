"use strict";

const CinetPay = require("./CinetPayProvider");
const OrangeMoney = require("./OrangeMoneyProvider");
const MoovMoney = require("./MoovMoneyProvider");
const Wave = require("./WaveProvider");
const FedaPay = require("./FedaPayProvider");

// Ordre = ordre d'affichage côté UI (premier = recommandé par défaut).
// FedaPay arrive en tête car il agrège tous les wallets UEMOA en un seul
// contrat marchand ; les autres restent activables en parallèle.
const instances = {
  fedapay: new FedaPay(),
  orange_money_bf: new OrangeMoney(),
  moov_money_bf: new MoovMoney(),
  wave: new Wave(),
  cinetpay: new CinetPay(),
};

function get(name) {
  const p = instances[name];
  if (!p) throw Object.assign(new Error(`Unknown payment provider: ${name}`), { status: 400, code: "unknown_provider" });
  return p;
}

function listForCountry(countryCode) {
  return Object.values(instances)
    .filter((p) => p.countries.includes(countryCode))
    .map((p) => ({ name: p.name, countries: p.countries, currencies: p.currencies }));
}

function all() {
  return Object.keys(instances);
}

module.exports = { get, listForCountry, all };
