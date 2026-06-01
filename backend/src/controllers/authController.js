"use strict";

const Joi = require("joi");
const User = require("../models/User");
const { signAccess, signRefresh } = require("../middleware/auth");
const { sendOtp, verifyOtp } = require("../services/otp");
const { BadRequest, Unauthorized, Conflict } = require("../utils/errors");

const phoneSchema = Joi.string().pattern(/^\+?[0-9]{8,15}$/).required();

const registerSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: phoneSchema,
  password: Joi.string().min(8).max(128).required(),
  full_name: Joi.string().min(2).max(120).required(),
  role: Joi.string().valid("buyer", "seller", "agent").default("buyer"),
  country_code: Joi.string().length(2).uppercase().default("BF"),
  locale: Joi.string().valid("fr", "en", "mos", "dyu").default("fr"),
});

async function register(req, res) {
  const { value, error } = registerSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  const existing = await User.findByPhone(value.phone);
  if (existing) throw Conflict("Phone already registered");
  const user = await User.create(value);
  await sendOtp(value.phone);
  res.status(201).json({ user, message: "OTP envoyé au numéro" });
}

const loginSchema = Joi.object({
  phone: phoneSchema,
  password: Joi.string().required(),
});

async function login(req, res) {
  const { value, error } = loginSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  const user = await User.findByPhone(value.phone);
  if (!user) throw Unauthorized("Identifiants invalides");
  const ok = await User.verifyPassword(user, value.password);
  if (!ok) throw Unauthorized("Identifiants invalides");
  const access = signAccess(user);
  const refresh = signRefresh(user, `${user.id}-${Date.now()}`);
  // Ne pas renvoyer password_hash
  const { password_hash: _pw, ...safe } = user;
  res.json({ user: safe, access, refresh });
}

const otpSchema = Joi.object({
  phone: phoneSchema,
  code: Joi.string().length(6).required(),
});

async function verifyPhone(req, res) {
  const { value, error } = otpSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  const ok = await verifyOtp(value.phone, value.code);
  if (!ok) throw BadRequest("Code OTP invalide ou expiré");
  const user = await User.findByPhone(value.phone);
  if (!user) throw BadRequest("Utilisateur introuvable");
  await User.markPhoneVerified(user.id);
  res.json({ verified: true });
}

async function me(req, res) {
  const user = await User.findById(req.user.id);
  res.json({ user });
}

async function resendOtp(req, res) {
  const { value, error } = Joi.object({ phone: phoneSchema }).validate(req.body);
  if (error) throw BadRequest(error.message);
  await sendOtp(value.phone);
  res.json({ sent: true });
}

// Étape 1 : demander un OTP de réinitialisation
async function forgotPassword(req, res) {
  const { value, error } = Joi.object({ phone: phoneSchema }).validate(req.body);
  if (error) throw BadRequest(error.message);
  const user = await User.findByPhone(value.phone);
  // Toujours répondre OK (évite l'énumération de numéros)
  if (user) await sendOtp(value.phone);
  res.json({ sent: true, message: "Si ce numéro est enregistré, un code a été envoyé." });
}

// Étape 2 : vérifier OTP + nouveau mot de passe
async function resetPassword(req, res) {
  const schema = Joi.object({
    phone: phoneSchema,
    code: Joi.string().length(6).required(),
    new_password: Joi.string().min(8).max(128).required(),
  });
  const { value, error } = schema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const ok = await verifyOtp(value.phone, value.code);
  if (!ok) throw BadRequest("Code OTP invalide ou expiré");

  const user = await User.findByPhone(value.phone);
  if (!user) throw BadRequest("Utilisateur introuvable");

  await User.updatePassword(value.phone, value.new_password);
  res.json({ success: true, message: "Mot de passe réinitialisé avec succès." });
}

module.exports = { register, login, verifyPhone, me, resendOtp, forgotPassword, resetPassword };
