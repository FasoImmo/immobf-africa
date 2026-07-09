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
const PaymentProviderModel = require("../models/PaymentProvider");
const registry = require("../services/PaymentProviderRegistry");
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

async function deleteUser(req, res) {
  if (req.params.id === req.user.id) {
    throw BadRequest("Vous ne pouvez pas supprimer votre propre compte admin.");
  }
  const deleted = await User.deleteById(req.params.id);
  if (!deleted) throw NotFound("Utilisateur introuvable");
  res.json({ deleted: true, user: deleted });
}

async function deleteProperty(req, res) {
  const deleted = await Property.deleteForAdmin(req.params.id);
  if (!deleted) throw NotFound("Annonce introuvable");
  res.json({ deleted: true, property: deleted });
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

/**
 * GET /admin/users/:id/stats
 * Stats détaillées d'un annonceur : transactions + interactions sur ses annonces.
 */
async function userStats(req, res) {
  const user = await User.findById(req.params.id);
  if (!user) throw NotFound("Utilisateur introuvable");
  const [transactions, interactions] = await Promise.all([
    Transaction.listForUserAdmin(req.params.id),
    Transaction.interactionStatsByUser(req.params.id),
  ]);
  res.json({ user, transactions, interactions });
}

/**
 * POST /admin/newsletter
 * Envoie une newsletter à tous les utilisateurs ayant un email,
 * avec filtre optionnel par pays (country_code).
 */
const newsletterSchema = Joi.object({
  subject:      Joi.string().min(3).max(200).required(),
  html:         Joi.string().min(10).required(),
  country_code: Joi.string().length(2).uppercase().allow(null, "").default(null),
});

async function sendNewsletter(req, res) {
  const { value, error } = newsletterSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const config = require("../config");
  if (!config.email.resendKey) throw BadRequest("RESEND_API_KEY non configurée");

  const { Resend } = require("resend");
  const resend = new Resend(config.email.resendKey);
  const FROM   = config.email.from || "ImmoBF Africa <no-reply@immoafrica.online>";

  // Récupérer tous les comptes avec un email, filtrés par pays si demandé
  const { query } = require("../config/db");
  const sql = value.country_code
    ? `SELECT email FROM users WHERE email IS NOT NULL AND country_code = $1 LIMIT 500`
    : `SELECT email FROM users WHERE email IS NOT NULL LIMIT 500`;
  const params = value.country_code ? [value.country_code] : [];
  const { rows } = await query(sql, params);

  const emails = [...new Set(rows.map((r) => r.email).filter(Boolean))];
  if (!emails.length) return res.json({ sent: 0, message: "Aucun destinataire trouvé." });

  // Resend supporte jusqu'à 50 destinataires par appel en batch
  const BATCH = 50;
  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    await resend.emails.send({
      from: FROM,
      to: batch,
      subject: value.subject,
      html: value.html,
    });
    sent += batch.length;
  }

  const logger = require("../utils/logger");
  logger.info({ sent, country: value.country_code }, "newsletter envoyée");
  res.json({ sent, total_recipients: emails.length });
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
    if (!admin.password_hash) {
      throw BadRequest("Ce compte n'a pas de mot de passe défini. Utilisez 'Mot de passe oublié' sur la page de connexion pour en créer un via email.");
    }
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

/**
 * POST /admin/test-email
 * { to: "dest@example.com" }
 * Envoie un email de test et renvoie le résultat Resend brut pour diagnostic.
 */
async function testEmail(req, res) {
  const { to } = req.body || {};
  if (!to || !to.includes("@")) throw BadRequest("Adresse email invalide");

  const { Resend } = require("resend");
  const config = require("../config");
  const FROM = config.email.from || "ImmoBF Africa <noreply@immoafrica.online>";

  if (!config.email.resendKey) {
    return res.json({ ok: false, error: "RESEND_API_KEY non configurée dans Railway", from: FROM });
  }

  const resend = new Resend(config.email.resendKey);
  const result = await resend.emails.send({
    from: FROM,
    to,
    subject: "Test email — ImmoBF Africa (admin diagnostic)",
    html: `<p>Email de test envoyé depuis Railway à ${new Date().toISOString()}.</p><p>FROM : ${FROM}</p>`,
    text: `Email de test ImmoBF Africa. FROM: ${FROM}`,
  });

  res.json({ ok: !result?.error, from: FROM, resend: result });
}

async function getPromo(req, res) {
  const PS = require("../models/PlatformSetting");
  const promo = await PS.getPromo();
  res.json(promo);
}

async function setPromo(req, res) {
  const PS = require("../models/PlatformSetting");
  const { active, start, end, message_fr, message_en, duration_days } = req.body;
  if (active !== undefined) await PS.set("promo_active", active ? "true" : "false");
  if (start !== undefined)  await PS.set("promo_start",  start  || null);
  if (end   !== undefined)  await PS.set("promo_end",    end    || null);
  if (message_fr !== undefined) await PS.set("promo_message_fr", message_fr || null);
  if (message_en !== undefined) await PS.set("promo_message_en", message_en || null);
  if (duration_days !== undefined) await PS.set("promo_duration_days", duration_days ? String(Number(duration_days)) : null);
  const promo = await PS.getPromo();
  res.json({ ok: true, promo });
}

const extendSchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
  note: Joi.string().max(500).allow("", null).default(null),
});

/**
 * POST /admin/properties/:id/extend
 * Prolonge la durée de publication d'une annonce.
 * Body: { days: number, note?: string }
 */
async function extendListing(req, res) {
  const { value, error } = extendSchema.validate(req.body || {});
  if (error) throw BadRequest(error.message);

  const property = await Property.extendListing(req.params.id, value.days);
  if (!property) throw NotFound("Annonce introuvable ou non publiée");

  // Notifier l'annonceur par email
  try {
    const owner = await User.findById(property.owner_id);
    if (owner && owner.email) {
      const { sendListingExtended } = require("../services/email");
      await sendListingExtended(owner.email, {
        propertyTitle: property.title,
        propertyId: property.id,
        newExpiryDate: property.listing_expires_at,
        addedDays: value.days,
      });
    }
  } catch (emailErr) {
    const logger = require("../utils/logger");
    logger.warn({ err: emailErr }, "extendListing: email annonceur non envoyé");
  }

  res.json({ ok: true, property });
}

/**
 * POST /admin/properties/:id/suspend
 * Suspend une annonce (published → suspended).
 * Body: { note?: string }
 */
async function suspendListing(req, res) {
  const { note } = req.body || {};
  const property = await Property.suspendListing(req.params.id);
  if (!property) throw NotFound("Annonce introuvable ou déjà suspendue");

  try {
    const owner = await User.findById(property.owner_id);
    if (owner && owner.email) {
      const { sendListingSuspended } = require("../services/email");
      await sendListingSuspended(owner.email, {
        propertyTitle: property.title,
        propertyId: property.id,
        reason: note || null,
      });
    }
  } catch (emailErr) {
    const logger = require("../utils/logger");
    logger.warn({ err: emailErr }, "suspendListing: email annonceur non envoyé");
  }

  res.json({ ok: true, property });
}

/**
 * POST /admin/properties/:id/restore
 * Réactive une annonce suspendue (suspended → published).
 */
async function restoreListing(req, res) {
  const property = await Property.restoreListing(req.params.id);
  if (!property) throw NotFound("Annonce introuvable ou non suspendue");

  try {
    const owner = await User.findById(property.owner_id);
    if (owner && owner.email) {
      const { sendListingRestored } = require("../services/email");
      await sendListingRestored(owner.email, {
        propertyTitle: property.title,
        propertyId: property.id,
      });
    }
  } catch (emailErr) {
    const logger = require("../utils/logger");
    logger.warn({ err: emailErr }, "restoreListing: email annonceur non envoyé");
  }

  res.json({ ok: true, property });
}

// ─── CRM contacts ────────────────────────────────────────────────────────────

async function listContacts(req, res) {
  const Contact = require("../models/Contact");
  const { country, language, limit = 200, offset = 0 } = req.query;
  const contacts = await Contact.list({ country, language, limit: Number(limit), offset: Number(offset) });
  const total    = await Contact.count({ country, language });
  res.json({ contacts, total });
}

async function sendContactNewsletter(req, res) {
  const { subject, html, country, language } = req.body || {};
  if (!subject || !html) throw BadRequest("subject et html sont requis");
  const Contact = require("../models/Contact");
  const { sendBulkNewsletter } = require("../services/email");
  const contacts = await Contact.list({ country, language, limit: 5000, offset: 0 });
  if (!contacts.length) return res.json({ sent: 0 });
  const logger = require("../utils/logger");
  let sent = 0;
  for (const c of contacts) {
    try {
      await sendBulkNewsletter(c.email, { subject, html, recipientName: c.name });
      sent++;
    } catch (e) {
      logger.warn({ err: e.message, email: c.email }, "contact newsletter send failed");
    }
  }
  res.json({ sent });
}


// ─── Tarifs & commissions ────────────────────────────────────────────────────

async function getPricingAdmin(req, res) {
  const PS = require("../models/PlatformSetting");
  const pricing = await PS.getPricing();
  res.json({ pricing });
}

async function setPricingAdmin(req, res) {
  const { listing_1m, listing_3m, listing_6m, listing_12m, commission_pct } = req.body || {};
  if ([listing_1m, listing_3m, listing_6m, listing_12m, commission_pct].some(
    (v) => v != null && (isNaN(Number(v)) || Number(v) < 0)
  )) throw BadRequest("Valeurs invalides — doivent être des nombres positifs");
  const PS = require("../models/PlatformSetting");
  await PS.setPricing({ listing_1m, listing_3m, listing_6m, listing_12m, commission_pct });
  const pricing = await PS.getPricing();
  res.json({ pricing });
}

/**
 * GET /admin/transactions
 * Liste filtrée + paginée de toutes les transactions.
 */
async function listTransactions(req, res) {
  const {
    date_from, date_to, search, country, purpose,
    provider, status, min_amount, max_amount,
    limit = 100, offset = 0,
  } = req.query;

  const result = await Transaction.listFiltered({
    date_from: date_from || undefined,
    date_to:   date_to   || undefined,
    search:    search    || undefined,
    country:   country   || undefined,
    purpose:   purpose   || undefined,
    provider:  provider  || undefined,
    status:    status    || undefined,
    min_amount: min_amount ? Number(min_amount) : undefined,
    max_amount: max_amount ? Number(max_amount) : undefined,
    limit:  Math.min(Number(limit)  || 100, 500),
    offset: Number(offset) || 0,
  });

  res.json(result);
}

/**
 * GET /admin/reviews
 * Liste tous les avis avec contexte : annonce, reviewer, vendeur.
 */
async function listReviews(req, res) {
  const { query } = require("../config/db");
  const { rows } = await query(`
    SELECT
      r.id, r.rating, r.comment, r.created_at,
      u.full_name  AS reviewer_name, u.phone AS reviewer_phone, u.email AS reviewer_email,
      p.title      AS property_title, p.id AS property_id,
      s.full_name  AS seller_name,   s.id AS seller_id
    FROM reviews r
    JOIN users      u ON u.id = r.reviewer_id
    JOIN properties p ON p.id = r.property_id
    JOIN users      s ON s.id = r.seller_id
    ORDER BY r.created_at DESC
    LIMIT 500
  `);
  res.json({ reviews: rows });
}

/**
 * DELETE /admin/reviews/:id
 * Suppression administrative d'un avis.
 */
async function deleteReview(req, res) {
  const { query } = require("../config/db");
  const { rows } = await query(
    `DELETE FROM reviews WHERE id = $1 RETURNING id`,
    [req.params.id]
  );
  if (!rows[0]) throw NotFound("Avis introuvable");
  res.json({ ok: true });
}

// ─── Brouillon newsletter hebdomadaire ───────────────────────────────────────

/**
 * GET /admin/newsletter/draft
 * Retourne le dernier brouillon sauvegardé (FR + EN).
 */
async function getNewsletterDraft(req, res) {
  const PS = require("../models/PlatformSetting");
  const [subject_fr, html_fr, subject_en, html_en, saved_at] = await Promise.all([
    PS.get("newsletter_draft_subject_fr"),
    PS.get("newsletter_draft_html_fr"),
    PS.get("newsletter_draft_subject_en"),
    PS.get("newsletter_draft_html_en"),
    PS.get("newsletter_draft_saved_at"),
  ]);
  const hasDraft = Boolean(subject_fr || html_fr || subject_en || html_en);
  res.json({ hasDraft, subject_fr, html_fr, subject_en, html_en, saved_at });
}

/**
 * POST /admin/newsletter/draft
 * Sauvegarde un brouillon (FR + EN).
 * Accepte requireAdmin OU l'header X-Draft-Secret (pour la tâche planifiée).
 */
const draftSchema = Joi.object({
  subject_fr: Joi.string().max(300).allow("", null),
  html_fr:    Joi.string().max(50000).allow("", null),
  subject_en: Joi.string().max(300).allow("", null),
  html_en:    Joi.string().max(50000).allow("", null),
});

async function saveNewsletterDraft(req, res) {
  const { value, error } = draftSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  const PS = require("../models/PlatformSetting");
  const now = new Date().toISOString();
  const ops = [];
  if (value.subject_fr != null) ops.push(PS.set("newsletter_draft_subject_fr", value.subject_fr));
  if (value.html_fr    != null) ops.push(PS.set("newsletter_draft_html_fr",    value.html_fr));
  if (value.subject_en != null) ops.push(PS.set("newsletter_draft_subject_en", value.subject_en));
  if (value.html_en    != null) ops.push(PS.set("newsletter_draft_html_en",    value.html_en));
  ops.push(PS.set("newsletter_draft_saved_at", now));
  await Promise.all(ops);
  const logger = require("../utils/logger");
  logger.info({ saved_at: now }, "newsletter draft saved");
  res.json({ saved: true, saved_at: now });
}

// ── Gestion des fournisseurs de paiement ──────────────────────────────────────

/**
 * GET /admin/payment-providers
 * Retourne la liste de tous les fournisseurs connus (registry) enrichie
 * de leur statut DB (enabled, programmations) et de leurs stats récentes.
 */
async function listPaymentProviders(req, res) {
  // Fournisseurs connus côté code
  const allProviderIds = registry.all();

  // Statuts DB
  const dbRows = await PaymentProviderModel.list();
  const dbMap = Object.fromEntries(dbRows.map((r) => [r.id, r]));

  // Stats globales par provider (toutes périodes)
  const stats = await Transaction.statsByProvider(null, null);
  const statsMap = Object.fromEntries(stats.map((s) => [s.provider, s]));

  // Stats 30 derniers jours
  const since30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const stats30 = await Transaction.statsByProvider(since30, null);
  const stats30Map = Object.fromEntries(stats30.map((s) => [s.provider, s]));

  const providers = allProviderIds.map((id) => {
    const db = dbMap[id];
    return {
      id,
      enabled:              db ? db.enabled              : true,
      scheduled_disable_at: db ? db.scheduled_disable_at : null,
      scheduled_enable_at:  db ? db.scheduled_enable_at  : null,
      disabled_reason:      db ? db.disabled_reason       : null,
      updated_at:           db ? db.updated_at            : null,
      stats_all:   statsMap[id]   || { nb_succeeded: 0, nb_failed: 0, nb_pending: 0, nb_total: 0, total_revenue: 0 },
      stats_30d:   stats30Map[id] || { nb_succeeded: 0, nb_failed: 0, nb_pending: 0, nb_total: 0, total_revenue: 0 },
    };
  });

  res.json({ providers });
}

const providerUpdateSchema = Joi.object({
  enabled:              Joi.boolean(),
  scheduled_disable_at: Joi.date().iso().allow(null, ""),
  scheduled_enable_at:  Joi.date().iso().allow(null, ""),
  disabled_reason:      Joi.string().max(300).allow(null, ""),
}).min(1);

/**
 * PATCH /admin/payment-providers/:id
 * Met à jour le statut (immédiat ou programmé) d'un fournisseur.
 */
async function updatePaymentProvider(req, res) {
  const providerId = req.params.id;
  if (!registry.all().includes(providerId)) throw BadRequest("Fournisseur inconnu");

  const { value, error } = providerUpdateSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const current = (await PaymentProviderModel.get(providerId)) || {
    enabled: true,
    scheduled_disable_at: null,
    scheduled_enable_at: null,
    disabled_reason: null,
  };

  const updated = await PaymentProviderModel.upsert(providerId, {
    enabled:              value.enabled              !== undefined ? value.enabled              : current.enabled,
    scheduled_disable_at: value.scheduled_disable_at !== undefined ? value.scheduled_disable_at : current.scheduled_disable_at,
    scheduled_enable_at:  value.scheduled_enable_at  !== undefined ? value.scheduled_enable_at  : current.scheduled_enable_at,
    disabled_reason:      value.disabled_reason       !== undefined ? value.disabled_reason       : current.disabled_reason,
  });

  const logger = require("../utils/logger");
  logger.info({ provider: providerId, changes: value, admin: req.user?.email }, "payment provider updated by admin");
  res.json({ provider: updated });
}

module.exports = {
  listUsers, setUserBlocked, logoutUser, deleteUser,
  listProperties, deleteProperty, listRevenues,
  paymentStats, userStats, sendNewsletter, updateAdminProfile, testEmail,
  getPromo, setPromo, extendListing, suspendListing, restoreListing,
  listContacts, sendContactNewsletter,
  getPricingAdmin, setPricingAdmin,
  listTransactions,
  listReviews, deleteReview,
  getNewsletterDraft, saveNewsletterDraft,
  listPaymentProviders, updatePaymentProvider,
};
