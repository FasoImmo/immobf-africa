"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");

const asyncHandler = require("../utils/asyncHandler");
const { requireAuth } = require("../middleware/auth");
const rawBody = require("../middleware/rawBody");

const authCtl   = require("../controllers/authController");
const propCtl   = require("../controllers/propertiesController");
const payCtl    = require("../controllers/paymentsController");
const photosCtl = require("../controllers/photosController");

const router = express.Router();

const authLimiter   = rateLimit({ windowMs: 60000, max: 10, standardHeaders: true });
const publicLimiter = rateLimit({ windowMs: 60000, max: 60 });

router.get("/health", function(_req, res) { res.json({ ok: true, ts: Date.now() }); });

router.post("/auth/register",   authLimiter, asyncHandler(authCtl.register));
router.post("/auth/login",      authLimiter, asyncHandler(authCtl.login));
router.post("/auth/otp/verify", authLimiter, asyncHandler(authCtl.verifyPhone));
router.post("/auth/otp/resend", authLimiter, asyncHandler(authCtl.resendOtp));
router.get ("/auth/me",         requireAuth, asyncHandler(authCtl.me));

router.get ("/properties",             publicLimiter, asyncHandler(propCtl.search));
router.post("/properties/estimate",    publicLimiter, asyncHandler(propCtl.estimate));
router.get ("/properties/:id",         publicLimiter, asyncHandler(propCtl.get));
router.post("/properties",             requireAuth,   asyncHandler(propCtl.create));
router.post("/properties/:id/publish", requireAuth,   asyncHandler(propCtl.publish));

router.post("/properties/:id/photos",  requireAuth, function(req, res, next) {
  photosCtl.upload(req, res, function(err) {
    if (err) return next(err);
    asyncHandler(photosCtl.addPhotos)(req, res, next);
  });
});

router.get ("/payments/providers",             asyncHandler(payCtl.listProviders));
router.post("/payments/initiate",              requireAuth, asyncHandler(payCtl.initiate));
router.get ("/payments",                       requireAuth, asyncHandler(payCtl.listMine));
router.get ("/payments/:id",                   requireAuth, asyncHandler(payCtl.get));
router.post("/payments/:id/escrow/release",    requireAuth, asyncHandler(payCtl.releaseEscrow));
router.post("/payments/webhooks/:provider",    rawBody, asyncHandler(payCtl.webhook));
router.post("/payments/mock/:reference/succeed", asyncHandler(payCtl.mockSucceed));

module.exports = router;
