"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rawBody = require("../middleware/rawBody");

const authCtl  = require("../controllers/authController");
const propCtl  = require("../controllers/propertiesController");
const payCtl   = require("../controllers/paymentsController");
const photoCtl = require("../controllers/photosController");
const analytics = require("../controllers/analyticsController");

const router = express.Router();

// Rate limits
const authLimiter = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true });
const publicLimiter = rateLimit({ windowMs: 60_000, max: 60 });

// Health
router.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// --- Auth ---
router.post("/auth/register",   authLimiter, asyncHandler(authCtl.register));
router.post("/auth/login",      authLimiter, asyncHandler(authCtl.login));
router.post("/auth/otp/verify",       authLimiter, asyncHandler(authCtl.verifyPhone));
router.post("/auth/otp/resend",       authLimiter, asyncHandler(authCtl.resendOtp));
router.post("/auth/forgot-password",  authLimiter, asyncHandler(authCtl.forgotPassword));
router.post("/auth/reset-password",   authLimiter, asyncHandler(authCtl.resetPassword));
router.get ("/auth/me",               requireAuth, asyncHandler(authCtl.me));

// --- Properties ---
router.get ("/properties",              publicLimiter, asyncHandler(propCtl.search));
router.post("/properties/estimate",     publicLimiter, asyncHandler(propCtl.estimate));
router.get ("/properties/:id",          publicLimiter, asyncHandler(propCtl.get));
router.post("/properties",              requireAuth,   asyncHandler(propCtl.create));
router.post("/properties/:id/publish",  requireAuth,   asyncHandler(propCtl.publish));
router.post("/properties/:id/photos",   requireAuth,   asyncHandler(photoCtl.uploadPhotos));
router.get ("/my/listings",             requireAuth,   asyncHandler(propCtl.myListings));

// --- Payments ---
router.get ("/payments/providers",       asyncHandler(payCtl.listProviders));
router.post("/payments/initiate",        requireAuth, asyncHandler(payCtl.initiate));
router.get ("/payments",                 requireAuth, asyncHandler(payCtl.listMine));
router.get ("/payments/:id",             requireAuth, asyncHandler(payCtl.get));
router.post("/payments/:id/escrow/release", requireAuth, asyncHandler(payCtl.releaseEscrow));

// Webhooks — raw body parser (HMAC verification)
router.post("/payments/webhooks/:provider", rawBody, asyncHandler(payCtl.webhook));

// --- Analytics ---
const analyticsLimiter = rateLimit({ windowMs: 10_000, max: 30 });
router.post("/properties/:id/view",     analyticsLimiter, asyncHandler(analytics.trackView));
router.post("/events/search",           analyticsLimiter, asyncHandler(analytics.trackSearch));
router.get ("/properties/:id/similar",  publicLimiter,    asyncHandler(analytics.similar));
router.get ("/properties/:id/stats",    requireAuth,      asyncHandler(analytics.propertyStats));
router.get ("/my/stats",                requireAuth,      asyncHandler(analytics.myStats));
router.get ("/suggestions",             asyncHandler(analytics.suggestions));

// Dev mocks
router.post("/payments/mock/:reference/succeed", asyncHandler(payCtl.mockSucceed));

module.exports = router;
