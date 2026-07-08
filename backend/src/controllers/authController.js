"use strict";

const Joi = require("joi");
const User = require("../models/User");
const Contact = require("../models/Contact");
const { signAccess, signRefresh, verify } = require("../middleware/auth");
const { sendOtp, verifyOtp } = require("../services/otp");
const { BadRequest, Unauthorized, Conflict } = require("../utils/errors");
const logger = require("../utils/logger");

const phoneSchema = Joi.string().pattern(/^\+?[0-9]{8,15}$/).required();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
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
  const existingPhone = await User.findByPhone(value.phone);
  if (existingPhone) throw Conflict("Numéro déjà utilisé");
  const existingEmail = await User.findByEmail(value.email);
  if (existingEmail) throw Conflict("Email déjà utilisé");
  const user = await User.create(value);
  // Synchroniser le nouveau compte dans le CRM contacts
  Contact.upsert({
    user_id:  user.id,
    email:    user.email,
    phone:    user.phone,
    name:     user.full_name,
    country:  user.country_code,
    language: user.locale,
  }).catch((e) => logger.warn({ err: e.message }, "register: Contact.upsert failed"));
  const access = signAccess(user);
  const refresh = signRefresh(user, `${user.id}-${Date.now()}`);
  const { password_hash: _pw, token_version: _tv, ...safe } = user;
  res.status(201).json({ user: safe, access, refresh });
}

const loginSchema = Joi.object({
  phone: Joi.string().pattern(/^\+?[0-9]{8,15}$/),
  email: Joi.string().email(),
  password: Joi.string().required(),
});

// Lockout : 5 échecs → verrouillage 30 min (clé Redis par email/téléphone)
const LOGIN_MAX_FAILS  = 5;
const LOGIN_FAIL_TTL   = 15 * 60; // fenêtre de comptage : 15 min
const LOGIN_LOCK_TTL   = 30 * 60; // durée de verrouillage : 30 min

async function login(req, res) {
  const { value, error } = loginSchema.validate(req.body);
  if (error) throw BadRequest(error.message);
  if (!value.phone && !value.email) throw BadRequest("Email ou téléphone requis");

  const identifier = (value.email || value.phone).toLowerCase();
  const { getRedis } = require("../config/redis");
  const redis = getRedis();

  // Vérifier si le compte est verrouillé
  const lockTtl = await redis.ttl(`login_lock:${identifier}`);
  if (lockTtl > 0) {
    throw Unauthorized(`Compte temporairement verrouillé après trop de tentatives. Réessayez dans ${Math.ceil(lockTtl / 60)} minute(s) ou utilisez « Mot de passe oublié ».`);
  }

  const user = value.email
    ? await User.findByEmail(value.email)
    : await User.findByPhone(value.phone);

  if (!user) {
    // Incrémenter même si l'utilisateur n'existe pas (évite l'énumération)
    const fails = await redis.incr(`login_fail:${identifier}`);
    await redis.expire(`login_fail:${identifier}`, LOGIN_FAIL_TTL);
    if (fails >= LOGIN_MAX_FAILS) {
      await redis.set(`login_lock:${identifier}`, "1", "EX", LOGIN_LOCK_TTL);
      await redis.del(`login_fail:${identifier}`);
    }
    throw Unauthorized("Identifiants invalides");
  }

  const ok = await User.verifyPassword(user, value.password);
  if (!ok) {
    const fails = await redis.incr(`login_fail:${identifier}`);
    await redis.expire(`login_fail:${identifier}`, LOGIN_FAIL_TTL);
    if (fails >= LOGIN_MAX_FAILS) {
      await redis.set(`login_lock:${identifier}`, "1", "EX", LOGIN_LOCK_TTL);
      await redis.del(`login_fail:${identifier}`);
      throw Unauthorized("Trop de tentatives échouées. Compte verrouillé 30 minutes. Utilisez « Mot de passe oublié » pour déverrouiller.");
    }
    throw Unauthorized("Identifiants invalides");
  }

  // Succès : effacer le compteur d'échecs
  await redis.del(`login_fail:${identifier}`);

  if (user.is_blocked) throw Unauthorized("Compte bloqué par l'administrateur. Contactez le support.");
  const access = signAccess(user);
  const refresh = signRefresh(user, `${user.id}-${Date.now()}`);
  // Ne pas renvoyer password_hash ni les champs internes de session
  const { password_hash: _pw, token_version: _tv, ...safe } = user;
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

// Ajoute/corrige l'email d'un compte existant (créé avant que l'email soit
// obligatoire à l'inscription). Nécessaire pour recevoir les reçus de
// paiement par email.
const updateEmailSchema = Joi.object({
  email: Joi.string().email().required(),
});

async function updateEmail(req, res) {
  const { value, error } = updateEmailSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const existing = await User.findByEmail(value.email);
  if (existing && existing.id !== req.user.id) throw Conflict("Email déjà utilisé par un autre compte");

  const user = await User.updateEmail(req.user.id, value.email);
  if (!user) throw BadRequest("Utilisateur introuvable");
  res.json({ user });
}

// Échange un refresh token valide contre un nouveau couple access/refresh.
// Rotation du refresh token à chaque appel (limite la fenêtre de rejeu si un
// refresh token venait à être intercepté).
const refreshSchema = Joi.object({
  refresh: Joi.string().required(),
});

async function refresh(req, res) {
  const { value, error } = refreshSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  let payload;
  try {
    payload = verify(value.refresh);
  } catch (_e) {
    throw Unauthorized("Invalid or expired refresh token");
  }
  if (payload.kind !== "refresh") throw Unauthorized("Wrong token type");

  const user = await User.findByIdWithAuth(payload.sub);
  if (!user) throw Unauthorized("Utilisateur introuvable");
  if (user.is_blocked) throw Unauthorized("Compte bloqué par l'administrateur");
  // tv mismatch = déconnexion forcée ou blocage déclenché depuis qu'a été
  // émis ce refresh token : on refuse le renouvellement.
  if ((payload.tv || 0) !== (user.token_version || 0)) {
    throw Unauthorized("Session invalidée — merci de vous reconnecter");
  }

  const access = signAccess(user);
  const newRefresh = signRefresh(user, `${user.id}-${Date.now()}`);
  res.json({ access, refresh: newRefresh });
}

async function resendOtp(req, res) {
  const { value, error } = Joi.object({ phone: phoneSchema }).validate(req.body);
  if (error) throw BadRequest(error.message);
  await sendOtp(value.phone);
  res.json({ sent: true });
}

// Étape 1 : demander un OTP de réinitialisation par EMAIL
async function forgotPassword(req, res) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
  });
  const { value, error } = schema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const user = await User.findByEmail(value.email);
  // Toujours répondre OK (évite l'énumération d'emails)
  if (user) {
    const { sendOtpEmail } = require("../services/email");
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { getRedis } = require("../config/redis");
    const redis = getRedis();
    await redis.set(`otp:email:${value.email.toLowerCase()}`, code, "EX", 300);
    // Fire-and-forget : on ne bloque pas la réponse sur l'API Resend
    sendOtpEmail(value.email, code, "reset").catch((e) =>
      logger.error({ err: e.message }, "forgotPassword: sendOtpEmail failed")
    );
  }
  res.json({ sent: true });
}

// Étape 2 : vérifier OTP + nouveau mot de passe (par email)
async function resetPassword(req, res) {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).required(),
    new_password: Joi.string().min(8).max(128).required(),
  });
  const { value, error } = schema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const { getRedis } = require("../config/redis");
  const redis = getRedis();
  const stored = await redis.get(`otp:email:${value.email.toLowerCase()}`);
  if (!stored || stored !== value.code) throw BadRequest("Code invalide ou expiré");
  await redis.del(`otp:email:${value.email.toLowerCase()}`);

  const user = await User.findByEmail(value.email);
  if (!user) throw BadRequest("Utilisateur introuvable");

  await User.updatePasswordByEmail(value.email, value.new_password);
  res.json({ success: true });
}

// ─── Modifier son propre profil (nom, téléphone, mot de passe) ───────────────
const updateUserProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(120).optional(),
  phone:     Joi.string().pattern(/^\+?[0-9]{8,15}$/).optional(),
  current_password: Joi.string().when("new_password", {
    is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional(),
  }),
  new_password: Joi.string().min(8).max(128).optional(),
}).min(1);

async function updateUserProfile(req, res) {
  const { value, error } = updateUserProfileSchema.validate(req.body);
  if (error) throw BadRequest(error.message);

  const user = await User.findByIdWithAuth(req.user.id);
  if (!user) throw BadRequest("Utilisateur introuvable");

  // Changement de mot de passe
  if (value.new_password) {
    if (!user.password_hash) {
      throw BadRequest("Aucun mot de passe défini. Utilisez 'Mot de passe oublié' sur la page de connexion.");
    }
    const ok = await User.verifyPassword(user, value.current_password);
    if (!ok) throw Unauthorized("Mot de passe actuel incorrect");
    await User.updatePasswordById(user.id, value.new_password);
  }

  // Changement de téléphone (= login)
  if (value.phone && value.phone !== user.phone) {
    const existing = await User.findByPhone(value.phone);
    if (existing && existing.id !== user.id) throw Conflict("Ce numéro est déjà utilisé par un autre compte");
    await User.updatePhone(user.id, value.phone);
  }

  // Changement de nom
  if (value.full_name && value.full_name !== user.full_name) {
    await User.updateFullName(user.id, value.full_name);
  }

  const updated = await User.findById(user.id);
  res.json({ user: updated });
}

module.exports = { register, login, verifyPhone, me, refresh, resendOtp, forgotPassword, resetPassword, updateEmail, updateUserProfile };
