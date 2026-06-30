"use strict";

// Contrôleur admin : tableau de bord réel pour suivre les abonnés (tous
// utilisateurs inscrits), les délais de publication des annonces, et
// agir (bloquer/débloquer/déconnecter un compte). Avant ce contrôleur,
// la page admin n'affichait que des statistiques globales en lecture
// seule — aucune action ni vue détaillée par utilisateur n'existait.

const Joi = require("joi");
const User = require("../models/User");
const Property = require("../models/Property");
const { BadRequest, NotFound } = require("../utils/errors");

const listSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(500).default(100),
  offset: Joi.number().integer().min(0).default(0),
});

async function listUsers(req, res) {
  const { value, error } = listSchema.validate(req.query);
  if (error) throw BadRequest(error.message);
  const users = await User.list({ limit: value.limit, offset: value.offset });
  res.json({ users });
}

const blockSchema = Joi.object({
  blocked: Joi.boolean().required(),
});

async function setUserBlocked(req, res) {
  const { value, error } = blockSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  // Un admin ne doit pas pouvoir se bloquer lui-même par erreur et se
  // retrouver coupé de son propre dashboard.
  if (req.params.id === req.user.id && value.blocked) {
    throw BadRequest("Vous ne pouvez pas bloquer votre propre compte.");
  }
  const updated = await User.setBlocked(req.params.id, value.blocked);
  if (!updated) throw NotFound("Utilisateur introuvable");
  res.json({ user: updated });
}

async function logoutUser(req, res) {
  const updated = await User.forceLogout(req.params.id);
  if (!updated) throw NotFound("Utilisateur introuvable");
  res.json({ ok: true });
}

async function listProperties(req, res) {
  const { value, error } = listSchema.validate(req.query);
  if (error) throw BadRequest(error.message);
  const properties = await Property.listAllForAdmin({ limit: value.limit, offset: value.offset });
  res.json({ properties });
}

module.exports = { listUsers, setUserBlocked, logoutUser, listProperties };
