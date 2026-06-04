import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.0,
  });
}
