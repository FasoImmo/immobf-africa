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
router.patch("/auth/me/profile",       requireAuth, asyncHandler(authCtl.updateUserProfile));

// --- Properties ---
router.get ("/properties",              publicLimiter, asyncHandler(propCtl.search));
router.post("/properties/estimate",     publicLimiter, asyncHandler(propCtl.estimate));
router.get ("/properties/:id",          publicLimiter, asyncHandler(propCtl.get));
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
router.get  ("/admin/payment-stats",        requireAdmin, asyncHandler(adminCtl.paymentStats));
router.patch("/admin/profile",              requireAdmin, asyncHandler(adminCtl.updateAdminProfile));
router.post ("/admin/test-email",           requireAdmin, asyncHandler(adminCtl.testEmail));
router.get  ("/admin/promo",               requireAdmin, asyncHandler(adminCtl.getPromo));
router.post ("/admin/promo",               requireAdmin, asyncHandler(adminCtl.setPromo));
router.post ("/admin/properties/:id/extend",  requireAdmin, asyncHandler(adminCtl.extendListing));
router.post ("/admin/properties/:id/suspend", requireAdmin, asyncHandler(adminCtl.suspendListing));
router.post ("/admin/properties/:id/restore", requireAdmin, asyncHandler(adminCtl.restoreListing));
router.get  ("/admin/contacts",               requireAdmin, asyncHandler(adminCtl.listContacts));
router.post ("/admin/contacts/newsletter",    requireAdmin, asyncHandler(adminCtl.sendContactNewsletter));

// --- Config publique (promo, etc.) ---
router.get("/config/promo", publicLimiter, asyncHandler(async (req, res) => {
  const PS = require("../models/PlatformSetting");
  const promo = await PS.getPromo();
  res.json(promo);
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
router.get ("/suggestions",             asyncHandler(analytics.suggestions));

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
