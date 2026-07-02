"use strict";

// Contrôleur admin : tableau de bord réel pour suivre les abonnés (tous
// utilisateurs inscrits), les délais de publication des annonces, et
// agir (bloquer/débloquer/déconnecter un compte). Avant ce contrôleur,
// la page admin n'affichait que des statistiques globales en lecture
// seule — aucune action ni vue détaillée par utilisateur n'existait.

const Joi = require("joi");
const argon2 = require("argon2");
const User = require("../models/User");
const Property = require("../models/Property");
const Transaction = require("../models/Transaction");
const { BadRequest, NotFound, Conflict } = require("../utils/errors");

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

/**
 * GET /admin/revenues
 * Retourne :
 *   - stats : KPIs globaux (CA total, répartition listing_fee/commission,
 *             nb transactions réussies/en cours/échouées, nb annonceurs actifs)
 *   - annonceurs : synthèse par utilisateur (total payé, nb annonces, pays
 *                  principal, date dernière activité)
 *   - transactions : 100 dernières transactions, toutes confondues
 */
async function listRevenues(req, res) {
  const [stats, annonceurs, transactions] = await Promise.all([
    Transaction.globalRevenueStats(),
    Transaction.revenuesByUser(),
    Transaction.listAllForAdmin({ limit: 100 }),
  ]);
  res.json({ stats, annonceurs, transactions });
}

const periodStatsSchema = Joi.object({
  start: Joi.string().isoDate().allow(null, "").default(null),
  end:   Joi.string().isoDate().allow(null, "").default(null),
});

/**
 * GET /admin/payment-stats?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Retourne :
 *   - period : KPIs filtrés par période (ou all-time si pas de filtre)
 *   - byProvider : répartition par provider de paiement
 */
async function paymentStats(req, res) {
  const { value, error } = periodStatsSchema.validate(req.query);
  if (error) throw BadRequest(error.message);
  const start = value.start || null;
  const end   = value.end   || null;
  const [period, byProvider] = await Promise.all([
    Transaction.statsByPeriod(start, end),
    Transaction.statsByProvider(start, end),
  ]);
  res.json({ period, byProvider });
}

const adminProfileSchema = Joi.object({
  current_password: Joi.string().when("new_password", {
    is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional(),
  }),
  new_password: Joi.string().min(8).optional(),
  phone:  Joi.string().pattern(/^\+?[0-9]{8,15}$/).optional(),
  email:  Joi.string().email().optional(),
}).min(1);

/**
 * PATCH /admin/profile
 * Permet à l'admin de changer son mot de passe, son login (téléphone) et/ou son email.
 * Si new_password est fourni, current_password est obligatoire.
 */
async function updateAdminProfile(req, res) {
  const { value, error } = adminProfileSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const admin = await User.findByIdWithAuth(req.user.id);
  if (!admin) throw NotFound("Compte introuvable");

  // Vérification mot de passe actuel si changement demandé
  if (value.new_password) {
    const ok = await argon2.verify(admin.password_hash, value.current_password);
    if (!ok) throw BadRequest("Mot de passe actuel incorrect");
    await User.updatePasswordById(req.user.id, value.new_password);
  }

  // Changement téléphone
  if (value.phone && value.phone !== admin.phone) {
    const existing = await User.findByPhone(value.phone);
    if (existing && existing.id !== req.user.id) throw Conflict("Ce numéro est déjà utilisé");
    await User.updatePhone(req.user.id, value.phone);
  }

  // Changement email
  if (value.email && value.email.toLowerCase() !== (admin.email || "").toLowerCase()) {
    const existing = await User.findByEmail(value.email);
    if (existing && existing.id !== req.user.id) throw Conflict("Cet email est déjà utilisé");
    await User.updateEmail(req.user.id, value.email);
  }

  // Retourner le profil mis à jour
  const updated = await User.findById(req.user.id);
  res.json({ user: updated });
}

module.exports = {
  listUsers, setUserBlocked, logoutUser, listProperties, listRevenues,
  paymentStats, updateAdminProfile,
};
