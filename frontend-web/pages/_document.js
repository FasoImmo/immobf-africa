import { Html, Head, Main, NextScript } from "next/document";

const SITE_URL = "https://immoafrica.online";

// JSON-LD : Organisation
const ldOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ImmoBF Africa",
  alternateName: "ImmoAfrica",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  contactPoint: {
    "@type": "ContactPoint",
    email: "contact@immoafrica.online",
    contactType: "customer service",
    availableLanguage: ["French", "English"],
  },
  sameAs: [
    "https://play.google.com/store/apps/details?id=africa.immobf.app",
    "https://apps.apple.com/app/id6809453557",
  ],
  foundingDate: "2025",
  foundingLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ouagadougou",
      addressCountry: "BF",
    },
  },
};

// JSON-LD : WebSite + SearchAction (sitelinks search box Google)
const ldWebSite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ImmoBF Africa",
  url: SITE_URL,
  description: "Plateforme immobilière africaine — achat, location et vente de biens immobiliers au Burkina Faso et en Afrique de l'Ouest. Paiement mobile money (Orange Money, Moov, Wave).",
  inLanguage: ["fr", "en"],
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/properties?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// JSON-LD : RealEstateAgent (entité principale)
const ldAgent = {
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  name: "ImmoBF Africa",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  description: "Portail immobilier de référence en Afrique de l'Ouest — annonces d'appartements, villas, terrains et locaux commerciaux au Burkina Faso, Côte d'Ivoire, Sénégal et dans toute la zone UEMOA.",
  areaServed: [
    { "@type": "Country", name: "Burkina Faso" },
    { "@type": "Country", name: "Côte d'Ivoire" },
    { "@type": "Country", name: "Sénégal" },
    { "@type": "Country", name: "Mali" },
    { "@type": "Country", name: "Togo" },
    { "@type": "Country", name: "Bénin" },
  ],
};

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* ── PWA ─────────────────────────────────────────────────────────── */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E7C66" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* ── iOS Safari PWA ───────────────────────────────────────────────── */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ImmoBF Africa" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* ── Favicons ────────────────────────────────────────────────────── */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* ── Vérification moteurs de recherche ───────────────────────────── */}
        {/* Google Search Console */}
        <meta name="google-site-verification" content="v-csxptQHijmKpBSimeU0zyAEo7-Rwo35M8aUNTPC4A" />
        {/* Bing Webmaster Tools — vérifié via import GSC (pas de meta tag nécessaire) */}
        {/* Yandex Webmaster — ajouter meta name="yandex-verification" une fois le code obtenu */}

        {/* ── SEO de base ─────────────────────────────────────────────────── */}
        <meta name="application-name" content="ImmoBF Africa" />
        <meta
          name="description"
          content="Achetez, louez ou vendez un bien immobilier en Afrique de l'Ouest — Burkina Faso, Côte d'Ivoire, Sénégal. Paiement Orange Money, Moov Money et Wave. App iOS & Android."
        />
        <meta name="keywords" content="immobilier Burkina Faso, location appartement Ouagadougou, achat villa Abidjan, terrain à vendre Dakar, immobilier Afrique, ImmoBF, immoafrica" />
        <meta name="author" content="Africa DEV YAZID CONSULTING" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

        {/* ── Open Graph ──────────────────────────────────────────────────── */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ImmoBF Africa" />
        <meta property="og:title" content="ImmoBF Africa — Immobilier en Afrique de l'Ouest" />
        <meta property="og:description" content="Achetez, louez ou vendez un bien immobilier en Afrique de l'Ouest. Paiement Orange Money, Wave, Moov. App iOS & Android." />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="ImmoBF Africa — Plateforme immobilière africaine" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:locale:alternate" content="en_US" />

        {/* ── Twitter / X Card ────────────────────────────────────────────── */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ImmoBFAfrica" />
        <meta name="twitter:title" content="ImmoBF Africa — Immobilier en Afrique de l'Ouest" />
        <meta name="twitter:description" content="Achetez, louez ou vendez un bien immobilier en Afrique. Paiement mobile money. App iOS & Android." />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />

        {/* ── Google Analytics GA4 ────────────────────────────────────────── */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-T60PJGBKF9" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-T60PJGBKF9', { page_path: window.location.pathname });
            `,
          }}
        />

        {/* ── Données structurées JSON-LD ─────────────────────────────────── */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldOrg) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldWebSite) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldAgent) }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
