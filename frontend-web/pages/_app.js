import "../styles/globals.css";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useEffect } from "react";
import "../lib/i18n";

const theme = createTheme({
  palette: {
    primary: { main: "#0E7C66" },      // vert sahelien
    secondary: { main: "#E0A500" },    // jaune soleil
  },
  typography: { fontFamily: "Inter, system-ui, sans-serif" },
});

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
