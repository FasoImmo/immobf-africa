/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "standalone",
  transpilePackages: ["react-leaflet-cluster"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },
  i18n: {
    locales: ["fr", "en"],
    defaultLocale: "fr",
    localeDetection: false,
  },
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["@mui/material", "@mui/icons-material"],
  },
  async headers() {
    const apiHost = process.env.NEXT_PUBLIC_API_URL
      ? new URL(process.env.NEXT_PUBLIC_API_URL).host
      : "localhost:4000";

    const csp = [
      "default-src 'self'",
      // Next.js requiert unsafe-inline pour les styles injectés et unsafe-eval pour HMR en dev
      // unsafe-eval requis uniquement en développement (HMR Next.js)
      process.env.NODE_ENV === "production"
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Images : self + data URIs + tout HTTPS (photos hébergées externement)
      "img-src 'self' data: blob: https:",
      // Tuiles de carte Leaflet/OSM
      "worker-src 'self' blob:",
      // Connexions API + WebSocket
      // Sentry ingest pour les erreurs navigateur
      `connect-src 'self' https://${apiHost} wss://${apiHost} https://*.ingest.sentry.io https://*.sentry.io`,
      // Polices locales uniquement
      "font-src 'self'",
      // Aucune iframe autorisée depuis l'extérieur
      "frame-src 'none'",
      "frame-ancestors 'none'",
      // Interdire les plugins (Flash, etc.)
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Headers présents avant
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "X-Frame-Options",          value: "DENY" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          // Nouveaux headers
          { key: "Content-Security-Policy",  value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=(self)",   // autorisé pour la carte
              "payment=()",
              "usb=()",
              "interest-cohort=()",   // désactive FLoC/Topics API
            ].join(", "),
          },
          // Empêche le sniffing MIME pour les scripts
          { key: "X-DNS-Prefetch-Control",   value: "on" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      // Cache long sur les assets statiques Next.js (immutables)
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  async rewrites() {
    // Forward /api/* to the backend API (avoids CORS in browser).
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Organisation et projet Sentry (pour l'upload des source maps)
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Ne pas afficher les logs Sentry au build
      silent: true,
      // Uploader les source maps en prod uniquement — ne pas les exposer publiquement
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
