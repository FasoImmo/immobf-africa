"use strict";

const { getRedis } = require("../config/redis");
const logger = require("../utils/logger");
const config = require("../config");

const TTL_SECONDS = 300; // 5 minutes

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtp(phone) {
  const code = generateCode();
  const redis = getRedis();
  await redis.set(`otp:${phone}`, code, "EX", TTL_SECONDS);

  // Twilio si configuré, sinon log (dev)
  if (config.sms.twilioSid && config.sms.twilioToken && config.sms.twilioFrom) {
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
      logger.warn({ err: e.message }, "Twilio send failed, falling back to log");
    }
  } else {
    logger.info({ phone, code }, "[DEV] OTP code (would be SMS)");
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
