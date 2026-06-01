"use strict";

const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");
const config = require("../config");
const { sendOtpEmail } = require("./email");

const TTL_SECONDS = 300; // 5 minutes

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Envoie un OTP au téléphone (SMS) et/ou à l'email si disponible.
 * @param {string} phone
 * @param {string|null} email - email optionnel pour envoi dual
 * @param {"verification"|"reset"} purpose
 */
async function sendOtp(phone, email = null, purpose = "verification") {
  const code = generateCode();
  const redis = getRedis();
  await redis.set(`otp:${phone}`, code, "EX", TTL_SECONDS);

  // Envoi email si disponible (gratuit, prioritaire)
  if (email) {
    await sendOtpEmail(email, code, purpose);
  }

  // Envoi SMS via Twilio si configuré
  if (config.sms?.twilioSid && config.sms?.twilioToken && config.sms?.twilioFrom) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.sms.twilioSid}/Messages.json`;
      const body = new URLSearchParams({
        From: config.sms.twilioFrom,
        To: phone,
        Body: `Votre code ImmoBF : ${code}. Expire dans 5 min.`,
      });
      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(`${config.sms.twilioSid}:${config.sms.twilioToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
    } catch (e) {
      logger.warn({ err: e.message }, "Twilio send failed");
    }
  } else if (!email) {
    // Ni email ni SMS → log pour dev
    logger.info({ phone, code }, "[DEV] OTP code (no email/SMS configured)");
  }
  return true;
}

async function verifyOtp(phone, code) {
  const redis = getRedis();
  const stored = await redis.get(`otp:${phone}`);
  if (!stored) return false;
  if (stored !== code) return false;
  await redis.del(`otp:${phone}`);
  return true;
}

module.exports = { sendOtp, verifyOtp };
