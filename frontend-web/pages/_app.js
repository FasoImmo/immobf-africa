import "../styles/globals.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useEffect } from "react";
import "../lib/i18n";
import i18n from "../lib/i18n";
import CookieBanner from "../components/CookieBanner";

const theme = createTheme({
  palette: {
    primary: { main: "#0E7C66" },      // vert sahelien
    secondary: { main: "#E0A500" },    // jaune soleil
  },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
});

export default function App({ Component, pageProps }) {
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
      <CssBaseline />
      <Component {...pageProps} />
      <CookieBanner />
    </ThemeProvider>
  );
}
