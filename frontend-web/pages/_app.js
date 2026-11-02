import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import Head from "next/head";
import { useRouter } from "next/router";
import { getI18n } from "../lib/i18n";
import CookieBanner from "../components/CookieBanner";

const SITE_URL = "https://immoafrica.online";

const theme = createTheme({
  palette: {
    primary: { main: "#0E7C66" },      // vert sahelien
    secondary: { main: "#E0A500" },    // jaune soleil
  },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
});

export default function App({ Component, pageProps }) {
  const { locale, defaultLocale, asPath } = useRouter();

  // URL canonique : supprime le préfixe de locale par défaut (/fr/) et les query params.
  // Ex: /fr/properties?q=villa → https://immoafrica.online/properties
  //     /en/properties         → https://immoafrica.online/en/properties
  const cleanPath = asPath.split("?")[0].split("#")[0];
  const localePart = locale === defaultLocale ? "" : `/${locale}`;
  const canonicalUrl = `${SITE_URL}${localePart}${cleanPath === "/" ? "" : cleanPath}`;

  // Langue : la locale de l'URL fait foi (/en → anglais), identique au rendu serveur.
  // Sur les URL sans préfixe (locale par défaut), la préférence enregistrée est
  // appliquée après hydratation, comme auparavant.
  const [lang, setLang] = useState(locale || defaultLocale || "fr");
  useEffect(() => {
    let next = locale || defaultLocale || "fr";
    if (locale === defaultLocale) {
      try {
        const saved = localStorage.getItem("immobf_lang");
        if (saved === "fr" || saved === "en") next = saved;
      } catch (_) {}
    }
    setLang(next);
  }, [locale, defaultLocale]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <I18nextProvider i18n={getI18n(lang)}>
    <ThemeProvider theme={theme}>
      <Head>
        {/* Canonical dynamique — résout les doublons i18n signalés par Google Search Console */}
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <CssBaseline />
      <Component {...pageProps} />
      <CookieBanner />
    </ThemeProvider>
    </I18nextProvider>
  );
}
