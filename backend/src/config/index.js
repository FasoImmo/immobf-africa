"use strict";

require("dotenv").config();

const required = (key, fallback) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined || v === null || v === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env var: ${key}`);
    }
  }
  return v;
};

module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "4000", 10),
  logLevel: process.env.LOG_LEVEL || "info",
  appUrl: process.env.APP_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:3000",

  email: {
    resendKey: process.env.RESEND_API_KEY || null,
    from: process.env.EMAIL_FROM || "ImmoBF Africa <noreply@immoafrica.online>",
  },

  db: {
    url: required("DATABASE_URL", "postgres://immobf:immobf_dev@localhost:5432/immobf"),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  mongo: {
    url: process.env.MONGO_URL || null,
  },

  auth: {
    jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtl: process.env.JWT_REFRESH_TTL || "30d",
  },

  commissions: {
    appPct: parseFloat(process.env.APP_COMMISSION_PCT || "2"),
    boostXof: parseInt(process.env.BOOST_PRICE_XOF || "5000", 10),
    agencySubXof: parseInt(process.env.AGENCY_SUBSCRIPTION_XOF || "20000", 10),
    listingFeeXof: parseInt(process.env.LISTING_FEE_XOF || "2000", 10),
    // Tarifs dégressifs par durée (FCFA)
    listingPlans: {
      1:  parseInt(process.env.LISTING_FEE_1M  || "2000",  10), // 1 mois
      3:  parseInt(process.env.LISTING_FEE_3M  || "5500",  10), // 3 mois (-8%)
      6:  parseInt(process.env.LISTING_FEE_6M  || "10000", 10), // 6 mois (-17%)
      12: parseInt(process.env.LISTING_FEE_12M || "18000", 10), // 12 mois (-25%)
    },
  },

  providers: {
    fedapay: {
      // sk_live_… ou sk_test_… selon mode
      secretKey: process.env.FEDAPAY_SECRET_KEY,
      publicKey: process.env.FEDAPAY_PUBLIC_KEY,
      // FedaPay signe les webhooks avec ce secret (configuré dans le dashboard)
      webhookSecret: process.env.FEDAPAY_WEBHOOK_SECRET,
      notifyUrl: process.env.FEDAPAY_NOTIFY_URL,
      returnUrl: process.env.FEDAPAY_RETURN_URL,
      // true => endpoint api.fedapay.com (production)
      // false/undefined => sandbox-api.fedapay.com (recommandé tant que le compte est en cours d'activation)
      live: process.env.FEDAPAY_LIVE === "true",
    },
    cinetpay: {
      apiKey: process.env.CINETPAY_API_KEY,
      siteId: process.env.CINETPAY_SITE_ID,
      secret: process.env.CINETPAY_SECRET_KEY,
      notifyUrl: process.env.CINETPAY_NOTIFY_URL,
    },
    orangeMoney: {
      merchantKey: process.env.ORANGE_MONEY_MERCHANT_KEY,
      authHeader: process.env.ORANGE_MONEY_AUTH_HEADER,
      webhookSecret: process.env.ORANGE_MONEY_WEBHOOK_SECRET,
      notifyUrl: process.env.ORANGE_MONEY_NOTIFY_URL,
    },
    moovMoney: {
      username: process.env.MOOV_MONEY_USERNAME,
      password: process.env.MOOV_MONEY_PASSWORD,
      webhookSecret: process.env.MOOV_MONEY_WEBHOOK_SECRET,
    },
    wave: {
      apiKey: process.env.WAVE_API_KEY,
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET,
    },
  },

  sms: {
    twilioSid: process.env.TWILIO_ACCOUNT_SID,
    twilioToken: process.env.TWILIO_AUTH_TOKEN,
    twilioFrom: process.env.TWILIO_FROM,
  },

  // Traduction automatique — DeepL Free (500k chars/mois gratuits)
  // Laisser vide pour désactiver (dégradation gracieuse)
  deepl: {
    apiKey: process.env.DEEPL_API_KEY || null,
  },

  storage: {
    driver: process.env.STORAGE_DRIVER || "local",
    localDir: process.env.STORAGE_LOCAL_DIR || "./uploads",
    s3: {
      bucket: process.env.S3_BUCKET,
      region: process.env.S3_REGION,
      accessKey: process.env.S3_ACCESS_KEY,
      secretKey: process.env.S3_SECRET_KEY,
      endpoint: process.env.S3_ENDPOINT,
    },
  },
};
