"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth, optionalAuth, requireRole } = require("../middleware/auth");
const rawBody = require("../middleware/rawBody");

const authCtl  = require("../controllers/authController");
const propCtl  = require("../controllers/propertiesController");
const payCtl   = require("../controllers/paymentsController");
const photoCtl = require("../controllers/photosController");
const analytics = require("../controllers/analyticsController");
const adminCtl = require("../controllers/adminController");
const metaCtl  = require("../controllers/metaWebhookController");
const msgCtl   = require("../controllers/messagesController");

const router = express.Router();

// Rate limits
const authLimiter  = rateLimit({ windowMs: 60_000,      max: 10, standardHeaders: true });
// Login : plus strict — 5 tentatives / 15 min / IP (le lockout Redis prend le relais par compte)
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000, max: 5, standardHeaders: true,
  message: { error: { message: "Trop de tentatives de connexion depuis cette adresse IP. Réessayez dans 15 minutes." } },
});
const publicLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// Health
router.get("/health", (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json({ ok: true, ts: Date.now() });
});

// --- Auth ---
router.post("/auth/register",   authLimiter, asyncHandler(authCtl.register));
router.post("/auth/login",      loginLimiter, asyncHandler(authCtl.login));
router.post("/auth/refresh",          authLimiter, asyncHandler(authCtl.refresh));
router.post("/auth/otp/verify",       authLimiter, asyncHandler(authCtl.verifyPhone));
router.post("/auth/otp/resend",       authLimiter, asyncHandler(authCtl.resendOtp));
router.post("/auth/forgot-password",  authLimiter, asyncHandler(authCtl.forgotPassword));
router.post("/auth/reset-password",   authLimiter, asyncHandler(authCtl.resetPassword));
router.get  ("/auth/me",               requireAuth, asyncHandler(authCtl.me));
router.patch("/auth/me/email",         requireAuth, asyncHandler(authCtl.updateEmail));
router.patch ("/auth/me/profile",      requireAuth, asyncHandler(authCtl.updateUserProfile));
router.delete("/auth/me",              requireAuth, asyncHandler(authCtl.deleteMe));

// --- Properties ---
router.get ("/properties",              publicLimiter, asyncHandler(propCtl.search));
router.post("/properties/estimate",     publicLimiter, asyncHandler(propCtl.estimate));
router.get ("/properties/:id",          publicLimiter, optionalAuth, asyncHandler(propCtl.get));
router.post("/properties",              requireAuth,   asyncHandler(propCtl.create));
router.post  ("/properties/:id/publish",             requireAuth, asyncHandler(propCtl.publish));
router.patch ("/properties/:id",                    requireAuth, asyncHandler(propCtl.update));
router.post  ("/properties/:id/photos",             requireAuth, asyncHandler(photoCtl.uploadPhotos));
router.delete("/properties/:id/photos/:photoId",    requireAuth, asyncHandler(photoCtl.deletePhoto));
router.get   ("/my/listings",                       requireAuth, asyncHandler(propCtl.myListings));
router.delete("/my/listings/:id",                   requireAuth, asyncHandler(propCtl.deleteListing));
router.post  ("/my/listings/:id/renew",             requireAuth, asyncHandler(propCtl.renewListing));

// --- Payments ---
router.get ("/payments/providers",       asyncHandler(payCtl.listProviders));
// initiate et get utilisent optionalAuth : fonctionnent pour les invités
// (sans compte) ET pour les utilisateurs connectés.
router.post("/payments/initiate",        optionalAuth, asyncHandler(payCtl.initiate));
router.get ("/payments",                 requireAuth,  asyncHandler(payCtl.listMine));
router.get ("/payments/:id",             optionalAuth, asyncHandler(payCtl.get));
router.post("/payments/:id/escrow/release", requireAuth, asyncHandler(payCtl.releaseEscrow));

// Webhooks — raw body parser (HMAC verification)
router.post("/payments/webhooks/:provider", rawBody, asyncHandler(payCtl.webhook));

// Webhooks Meta Lead Ads (pas d'auth — Facebook appelle ces URLs directement)
router.get ("/webhooks/meta", asyncHandler(metaCtl.verify));
router.post("/webhooks/meta", rawBody,  asyncHandler(metaCtl.receive));

// --- Admin : suivi des abonnés + délais de publication + blocage/déconnexion ---
const requireAdmin = [requireAuth, requireRole("admin")];

// DIAGNOSTIC TEMPORAIRE (29/06/2026) — voir paymentsController.js. À retirer
// une fois le callback PawaPay confirmé stable.
router.get ("/admin/pawapay/last",                      requireAdmin, asyncHandler(payCtl.adminPawapayLast));
router.post("/admin/pawapay/resend-callback/:depositId", requireAdmin, asyncHandler(payCtl.adminPawapayResendCallback));
router.get  ("/admin/users",                requireAdmin, asyncHandler(adminCtl.listUsers));
router.patch("/admin/users/:id/block",      requireAdmin, asyncHandler(adminCtl.setUserBlocked));
router.post ("/admin/users/:id/logout",     requireAdmin, asyncHandler(adminCtl.logoutUser));
router.delete("/admin/users/:id",           requireAdmin, asyncHandler(adminCtl.deleteUser));
router.get   ("/admin/properties",          requireAdmin, asyncHandler(adminCtl.listProperties));
router.delete("/admin/properties/:id",      requireAdmin, asyncHandler(adminCtl.deleteProperty));
router.get  ("/admin/revenues",             requireAdmin, asyncHandler(adminCtl.listRevenues));
router.get  ("/admin/users/:id/stats",      requireAdmin, asyncHandler(adminCtl.userStats));
router.post ("/admin/newsletter",           requireAdmin, asyncHandler(adminCtl.sendNewsletter));
router.get  ("/admin/newsletter/draft",     requireAdmin, asyncHandler(adminCtl.getNewsletterDraft));
// saveNewsletterDraft : accepte requireAdmin OU X-Draft-Secret (tâche planifiée Cowork)
router.post ("/admin/newsletter/draft",     asyncHandler(async (req, res, next) => {
  const secret = process.env.NEWSLETTER_DRAFT_SECRET;
  if (secret && req.headers["x-draft-secret"] === secret) return next();
  // Sinon : vérification admin standard
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    requireRole("admin")(req, res, next);
  });
}), asyncHandler(adminCtl.saveNewsletterDraft));
router.get  ("/admin/payment-stats",          requireAdmin, asyncHandler(adminCtl.paymentStats));
router.get  ("/admin/payment-stats/by-mode", requireAdmin, asyncHandler(adminCtl.paymentStatsByMode));
router.patch("/admin/profile",              requireAdmin, asyncHandler(adminCtl.updateAdminProfile));
router.post ("/admin/test-email",           requireAdmin, asyncHandler(adminCtl.testEmail));
router.get  ("/admin/promo",               requireAdmin, asyncHandler(adminCtl.getPromo));
router.post ("/admin/promo",               requireAdmin, asyncHandler(adminCtl.setPromo));
router.get  ("/admin/pricing",             requireAdmin, asyncHandler(adminCtl.getPricingAdmin));
router.patch("/admin/pricing",             requireAdmin, asyncHandler(adminCtl.setPricingAdmin));
router.post ("/admin/properties/:id/extend",  requireAdmin, asyncHandler(adminCtl.extendListing));
router.post ("/admin/properties/:id/suspend", requireAdmin, asyncHandler(adminCtl.suspendListing));
router.post ("/admin/properties/:id/restore", requireAdmin, asyncHandler(adminCtl.restoreListing));
router.get  ("/admin/transactions",           requireAdmin, asyncHandler(adminCtl.listTransactions));
router.get  ("/admin/contacts",               requireAdmin, asyncHandler(adminCtl.listContacts));
router.post ("/admin/contacts/newsletter",    requireAdmin, asyncHandler(adminCtl.sendContactNewsletter));
router.get  ("/admin/reviews",                requireAdmin, asyncHandler(adminCtl.listReviews));
router.delete("/admin/reviews/:id",           requireAdmin, asyncHandler(adminCtl.deleteReview));

// --- Qualité des annonces ---
router.get  ("/admin/listing-quality",        requireAdmin, asyncHandler(adminCtl.listingQualityReport));
router.post ("/admin/listing-quality/run",    requireAdmin, asyncHandler(adminCtl.runListingQualityAlerts));

// --- Gestion des fournisseurs de paiement ---
router.get  ("/admin/payment-providers",      requireAdmin, asyncHandler(adminCtl.listPaymentProviders));
router.patch("/admin/payment-providers/:id",  requireAdmin, asyncHandler(adminCtl.updatePaymentProvider));

// --- Config publique (promo, etc.) ---
router.get("/config/promo", publicLimiter, asyncHandler(async (req, res) => {
  const PS = require("../models/PlatformSetting");
  const promo = await PS.getPromo();
  res.json(promo);
}));

// Public pricing endpoint
router.get("/config/pricing", publicLimiter, asyncHandler(async (req, res) => {
  const PS = require("../models/PlatformSetting");
  const pricing = await PS.getPricing();
  res.json(pricing);
}));

// --- Analytics ---
const analyticsLimiter = rateLimit({ windowMs: 10_000, max: 30 });
router.post("/properties/:id/view",     analyticsLimiter, optionalAuth, asyncHandler(analytics.trackView));
router.post("/events/search",           analyticsLimiter, asyncHandler(analytics.trackSearch));
router.get ("/properties/:id/similar",      publicLimiter, asyncHandler(analytics.similar));
router.get ("/properties/:id/stats",        requireAuth,   asyncHandler(analytics.propertyStats));
router.get ("/properties/:id/availability", publicLimiter, asyncHandler(async (req, res) => {
  const Booking = require("../models/Booking");
  const [booked, blocked] = await Promise.all([
    Booking.listForProperty(req.params.id),
    Booking.listBlocksForProperty(req.params.id),
  ]);
  res.json({ booked, blocked });
}));

// --- Blocage manuel de dates par l'annonceur ---
router.get   ("/my/listings/:id/block-dates",          requireAuth, asyncHandler(async (req, res) => {
  const Booking  = require("../models/Booking");
  const Property = require("../models/Property");
  const prop = await Property.findById(req.params.id);
  const { NotFound } = require("../utils/errors");
  if (!prop || prop.owner_id !== req.user.id) throw NotFound("Annonce introuvable");
  const blocks = await Booking.listBlocksForProperty(req.params.id);
  res.json({ blocks });
}));

router.post  ("/my/listings/:id/block-dates",          requireAuth, asyncHandler(async (req, res) => {
  const Booking  = require("../models/Booking");
  const Property = require("../models/Property");
  const { BadRequest, NotFound } = require("../utils/errors");
  const { check_in, check_out, note } = req.body || {};
  if (!check_in || !check_out) throw BadRequest("check_in et check_out sont requis");
  if (new Date(check_out) <= new Date(check_in)) throw BadRequest("check_out doit être après check_in");
  const prop = await Property.findById(req.params.id);
  if (!prop || prop.owner_id !== req.user.id) throw NotFound("Annonce introuvable");
  const block = await Booking.addBlock(req.params.id, check_in, check_out, note);
  res.status(201).json({ block });
}));

router.delete("/my/listings/:id/block-dates/:blockId", requireAuth, asyncHandler(async (req, res) => {
  const Booking  = require("../models/Booking");
  const Property = require("../models/Property");
  const { NotFound } = require("../utils/errors");
  const prop = await Property.findById(req.params.id);
  if (!prop || prop.owner_id !== req.user.id) throw NotFound("Annonce introuvable");
  const removed = await Booking.removeBlock(req.params.blockId, req.params.id);
  if (!removed) throw NotFound("Bloc de dates introuvable");
  res.json({ ok: true });
}));
router.get ("/my/stats",                requireAuth,      asyncHandler(analytics.myStats));
router.get ("/my/stats/dashboard",     requireAuth,      asyncHandler(analytics.sellerDashboard));
router.get ("/suggestions",             asyncHandler(analytics.suggestions));

// ─── Recherches sauvegardées / alertes email ─────────────────────────────────
const searchesLimiter = rateLimit({ windowMs: 60_000, max: 5 });

// POST /searches/save  — s'inscrire à des alertes
router.post("/searches/save", searchesLimiter, asyncHandler(async (req, res) => {
  const { BadRequest } = require("../utils/errors");
  const SavedSearch = require("../models/SavedSearch");
  const { email, filters } = req.body || {};
  if (!email || !email.includes("@")) throw BadRequest("Email invalide");
  const record = await SavedSearch.create(email, filters || {});
  res.status(201).json({ ok: true, id: record?.id || null });
}));

// DELETE /searches/:id  — se désabonner (API)
router.delete("/searches/:id", asyncHandler(async (req, res) => {
  const SavedSearch = require("../models/SavedSearch");
  await SavedSearch.remove(req.params.id);
  res.json({ ok: true });
}));

// GET /searches/:id/unsubscribe  — lien one-click depuis l'email (GET)
router.get("/searches/:id/unsubscribe", asyncHandler(async (req, res) => {
  const SavedSearch = require("../models/SavedSearch");
  await SavedSearch.remove(req.params.id);
  const frontendUrl = process.env.FRONTEND_URL || "https://www.immoafrica.online";
  // Redirige vers une page de confirmation lisible
  res.redirect(302, `${frontendUrl}/properties?unsubscribed=1`);
}));

// ─── Profil public annonceur ──────────────────────────────────────────────────
router.get("/sellers/:id", publicLimiter, asyncHandler(async (req, res) => {
  const { query: dbQ } = require("../config/db");
  const { NotFound } = require("../utils/errors");
  const Property = require("../models/Property");

  // Infos publiques du vendeur (pas d'email/téléphone)
  const { rows } = await dbQ(
    `SELECT id, full_name, country_code, created_at
     FROM users WHERE id = $1 AND is_blocked = false`,
    [req.params.id]
  );
  if (!rows[0]) throw NotFound("Annonceur introuvable");
  const seller = rows[0];

  // Annonces publiées actives
  const { rows: propRows } = await dbQ(
    `SELECT p.id, p.type, p.transaction_type, p.title, p.price, p.currency,
            p.city, p.country_code, p.area_m2, p.bedrooms, p.published_at,
            p.lat, p.lng,
            (SELECT photo_url FROM property_photos pp WHERE pp.property_id = p.id ORDER BY pp.position ASC LIMIT 1) AS cover_photo
       FROM properties p
      WHERE p.owner_id = $1
        AND p.status = 'published'
        AND (p.listing_expires_at IS NULL OR p.listing_expires_at > NOW())
      ORDER BY p.published_at DESC`,
    [req.params.id]
  );

  // Score moyen
  const Review = require("../models/Review");
  const reviewStats = await Review.statsForSeller(req.params.id);

  res.json({ seller: { ...seller, ...reviewStats }, listings: propRows });
}));

// ─── Avis & notations ────────────────────────────────────────────────────────
const reviewsLimiter = rateLimit({ windowMs: 60_000, max: 10 });

// POST /properties/:id/review — laisser / modifier un avis (acheteur connecté)
router.post("/properties/:id/review", requireAuth, reviewsLimiter, asyncHandler(async (req, res) => {
  const Joi = require("joi");
  const Review = require("../models/Review");
  const Property = require("../models/Property");
  const { BadRequest, Forbidden, NotFound } = require("../utils/errors");

  const schema = Joi.object({
    rating:  Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().min(5).max(1000).allow("", null),
  });
  const { value, error } = schema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const prop = await Property.findById(req.params.id);
  if (!prop) throw NotFound("Annonce introuvable");
  if (prop.owner_id === req.user.id) throw Forbidden("Vous ne pouvez pas noter votre propre annonce");

  const review = await Review.upsert(req.params.id, req.user.id, prop.owner_id, value);
  res.json({ review });
}));

// GET /properties/:id/review/me — avis existant du user connecté
router.get("/properties/:id/review/me", requireAuth, asyncHandler(async (req, res) => {
  const Review = require("../models/Review");
  const review = await Review.findByPropertyAndReviewer(req.params.id, req.user.id);
  res.json({ review: review || null });
}));

// GET /sellers/:id/reviews — avis reçus par un vendeur (public)
router.get("/sellers/:id/reviews", publicLimiter, asyncHandler(async (req, res) => {
  const Review = require("../models/Review");
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 10);
  const offset = (page - 1) * limit;
  const [reviews, stats] = await Promise.all([
    Review.listForSeller(req.params.id, { limit, offset }),
    Review.statsForSeller(req.params.id),
  ]);
  res.json({ reviews, stats, page, limit });
}));

// ─── Messagerie interne ───────────────────────────────────────────────────────
const msgLimiter = rateLimit({ windowMs: 60_000, max: 30 });

// Démarrer ou récupérer une conversation (buyer → property)
router.post  ("/conversations",              requireAuth, msgLimiter, asyncHandler(msgCtl.startConversation));
// Liste mes conversations
router.get   ("/conversations",              requireAuth,             asyncHandler(msgCtl.listConversations));
// Nombre de messages non-lus (badge navbar)
router.get   ("/conversations/unread",       requireAuth,             asyncHandler(msgCtl.unreadCount));
// Messages d'une conversation + marque comme lus
router.get   ("/conversations/:id/messages", requireAuth,             asyncHandler(msgCtl.getMessages));
// Envoyer un message
router.post  ("/conversations/:id/messages", requireAuth, msgLimiter, asyncHandler(msgCtl.sendMessage));

// Newsletter
router.post("/newsletter/subscribe", publicLimiter, asyncHandler(async (req, res) => {
  const { email, name } = req.body || {};
  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: { message: "Email invalide" } });
  }
  const { sendNewsletterConfirmation } = require("../services/email");
  await sendNewsletterConfirmation(email);
  // Optionnel : stocker en DB
  try {
    const { query: dbQ } = require("../config/db");
    await dbQ(
      `INSERT INTO newsletter_subscribers (email, name) VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING`,
      [email, name || null]
    );
  } catch (_) { /* noop */ }
  res.json({ subscribed: true });
}));

// Dev mocks — DÉSACTIVÉ en production
if (process.env.NODE_ENV !== "production") {
  router.post("/payments/mock/:reference/succeed", asyncHandler(payCtl.mockSucceed));
}

module.exports = router;
