import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import "../lib/i18n";
import i18n from "../lib/i18n";
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

  useEffect(() => {
    // Restaurer la langue après hydratation (évite les erreurs React #418/#423/#425)
    const savedLang = localStorage.getItem("immobf_lang");
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Head>
        {/* Canonical dynamique — résout les doublons i18n signalés par Google Search Console */}
        <link rel="canonical" href={canonicalUrl} />
      </Head>
      <CssBaseline />
      <Component {...pageProps} />
      <CookieBanner />
    </ThemeProvider>
  );
}
