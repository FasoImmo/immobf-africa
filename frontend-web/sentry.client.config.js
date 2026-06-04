import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",

    // Traces côté navigateur — 100 % au lancement, réduire après
    tracesSampleRate: process.env.NODE_ENV === "production" ? 1.0 : 0.0,

    // Replay sessions sur les erreurs uniquement (ne consomme pas le quota)
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,       // masquer les données personnelles dans les replays
        blockAllMedia: true,
      }),
    ],

    ignoreErrors: [
      // Erreurs réseau transitoires (offline, connexion mobile instable)
      "NetworkError",
      "Failed to fetch",
      "Load failed",
      // Erreurs d'extensions navigateur (hors de notre contrôle)
      /extension/i,
      /^chrome:\/\//,
    ],
  });
}
