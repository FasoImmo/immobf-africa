import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="fr">
      <Head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0E7C66" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS Safari PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ImmoBF Africa" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />

        {/* SEO */}
        <meta name="google-site-verification" content="v-csxptQHijmKpBSimeU0zyAEo7-Rwo35M8aUNTPC4A" />
        <meta name="application-name" content="ImmoBF Africa" />
        <meta name="description" content="Plateforme immobilière africaine — achat, location, mobile money" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="ImmoBF Africa" />
        <meta property="og:image" content="/icon-512.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
