"use strict";

const Joi = require("joi");
const Property = require("../models/Property");
const { BadRequest, NotFound, Forbidden } = require("../utils/errors");
const moderation = require("../services/moderation");
const valuation = require("../services/valuation");

const propertySchema = Joi.object({
  transaction_type: Joi.string().valid("sale", "rent_long", "rent_short").default("sale"),
  type: Joi.string().valid("land", "house", "apartment", "office", "commercial").required(),
  title: Joi.string().min(5).max(200).required(),
  description: Joi.string().max(5000).allow("", null),
  price: Joi.number().positive().required(),
  currency: Joi.string().length(3).uppercase().default("XOF"),
  area_m2: Joi.number().positive().allow(null),
  bedrooms: Joi.number().integer().min(0).allow(null),
  bathrooms: Joi.number().integer().min(0).allow(null),
  country_code: Joi.string().length(2).uppercase().default("BF"),
  city: Joi.string().min(2).max(120).required(),
  neighborhood: Joi.string().max(150).allow("", null),
  address: Joi.string().max(300).allow("", null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  deposit_pct: Joi.number().min(0).max(100).default(5),
  is_furnished: Joi.boolean().default(false),
  rent_period: Joi.string().valid("monthly", "weekly", "nightly").allow(null),
  features: Joi.object().unknown(true).default({}),
});

async function create(req, res) {
  const { value, error } = propertySchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const score = moderation.overallScore({
    title: value.title, description: value.description, price: value.price,
  });
  const decision = moderation.decision(score);
  if (decision === "reject") {
    throw BadRequest("Annonce rejetée par modération automatique (contenu suspect)");
  }

  const property = await Property.create({ ...value, owner_id: req.user.id });
  res.status(201).json({ property, moderation: { score, decision } });
}

async function get(req, res) {
  const lang = req.query.lang || "fr";
  const p = await Property.findById(req.params.id, { lang });
  if (!p) throw NotFound("Annonce introuvable");
  const photos = await Property.photosFor(p.id);
  res.json({ property: { ...p, photos } });
}

async function publish(req, res) {
  const p = await Property.publish(req.params.id, req.user.id);
  if (!p) throw Forbidden("Non autorisé ou annonce introuvable");
  res.json({ property: p });
}

async function search(req, res) {
  const schema = Joi.object({
    q: Joi.string().allow("", null),
    country: Joi.string().length(2).uppercase(),
    transaction_type: Joi.string().valid("sale", "rent_long", "rent_short"),
    city: Joi.string(),
    neighborhood: Joi.string(),
    type: Joi.string().valid("land", "house", "apartment", "office", "commercial"),
    min_price: Joi.number(),
    max_price: Joi.number(),
    min_area: Joi.number(),
    bedrooms: Joi.number().integer(),
    lat: Joi.number(),
    lng: Joi.number(),
    radius_km: Joi.number().min(0).max(500),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    lang: Joi.string().valid("fr", "en", "mos", "dyu").default("fr"),
  });
  const { value, error } = schema.validate(req.query);
  if (error) throw BadRequest(error.message);
  const { limit, offset, lang, ...filters } = value;
  const items = await Property.search(filters, { limit, offset, lang });
  res.json({ items, limit, offset });
}

async function estimate(req, res) {
  const schema = Joi.object({
    country_code: Joi.string().length(2).uppercase().default("BF"),
    city: Joi.string().required(),
    type: Joi.string().valid("land", "house", "apartment", "office", "commercial").required(),
    area_m2: Joi.number().positive().allow(null),
  });
  const { value, error } = schema.validate(req.body);
  if (error) throw BadRequest(error.message);
  const result = await valuation.estimate(value);
  res.json(result);
}

async function myListings(req, res) {
  const items = await Property.listForOwner(req.user.id);
  const photosAll = await Promise.all(items.map((p) => Property.photosFor(p.id)));
  const result = items.map((p, i) => ({ ...p, photos: photosAll[i] }));
  res.json({ items: result });
}

// Schéma de mise à jour — tous les champs sont optionnels.
// Les champs de durée/publication sont volontairement absents.
const updateSchema = Joi.object({
  transaction_type: Joi.string().valid("sale", "rent_long", "rent_short"),
  type: Joi.string().valid("land", "house", "apartment", "office", "commercial"),
  title: Joi.string().min(5).max(200),
  description: Joi.string().max(5000).allow("", null),
  price: Joi.number().positive(),
  currency: Joi.string().length(3).uppercase(),
  area_m2: Joi.number().positive().allow(null),
  bedrooms: Joi.number().integer().min(0).allow(null),
  bathrooms: Joi.number().integer().min(0).allow(null),
  country_code: Joi.string().length(2).uppercase(),
  city: Joi.string().min(2).max(120),
  neighborhood: Joi.string().max(150).allow("", null),
  address: Joi.string().max(300).allow("", null),
  lat: Joi.number().min(-90).max(90).allow(null),
  lng: Joi.number().min(-180).max(180).allow(null),
  is_furnished: Joi.boolean(),
  rent_period: Joi.string().valid("monthly", "weekly", "nightly").allow(null),
  features: Joi.object().unknown(true),
});

async function update(req, res) {
  const { value, error } = updateSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const p = await Property.findById(req.params.id);
  if (!p) throw NotFound("Annonce introuvable");
  if (p.owner_id !== req.user.id) throw Forbidden("Non autorisé");

  const updated = await Property.update(req.params.id, req.user.id, value);
  if (!updated) throw Forbidden("Non autorisé ou annonce introuvable");
  const photos = await Property.photosFor(updated.id);
  res.json({ property: { ...updated, photos } });
}

async function deleteListing(req, res) {
  const p = await Property.findById(req.params.id);
  if (!p) throw NotFound("Annonce introuvable");
  if (p.owner_id !== req.user.id) throw Forbidden("Non autorisé");
  await Property.deleteForOwner(req.params.id, req.user.id);
  res.json({ deleted: true });
}

async function renewListing(req, res) {
  const p = await Property.findById(req.params.id);
  if (!p) throw NotFound("Annonce introuvable");
  if (p.owner_id !== req.user.id) throw Forbidden("Non autorisé");
  // Renouveler = remettre à zéro listing_fee_paid_at pour forcer un nouveau paiement
  // Le frontend redirigera vers le flow paiement listing_fee
  res.json({
    property_id: req.params.id,
    current_expiry: p.listing_expires_at,
    renew_required: true,
    message: "Procédez au paiement de renouvellement via le formulaire de publication.",
  });
}

module.exports = { create, get, publish, search, estimate, myListings, update, deleteListing, renewListing };
