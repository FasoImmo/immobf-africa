import Link from "next/link";
import Head from "next/head";
import { useTranslation } from "react-i18next";
import { AppBar, Toolbar, Typography, Button, Container, Box, Select, MenuItem } from "@mui/material";

export default function Layout({ children, title = "ImmoBF Africa" }) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0E7C66" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ color: "inherit", textDecoration: "none" }}>
              {t("app_name")}
            </Link>
          </Typography>
          <Button color="inherit" component={Link} href="/properties">{t("nav.browse")}</Button>
          <Button color="inherit" component={Link} href="/sell">{t("nav.sell")}</Button>
          <Button color="inherit" component={Link} href="/properties?transaction_type=rent_long">Louer</Button>
          <Select
            value={i18n.language}
            onChange={(e) => {
              const lang = e.target.value;
              i18n.changeLanguage(lang);
              // Persister la langue → getLang() dans api.js le lit
              if (typeof window !== "undefined") {
                localStorage.setItem("immobf_lang", lang);
                // Recharger la page pour que les annonces se rechargent dans la nouvelle langue
                window.location.reload();
              }
            }}
            variant="standard"
            sx={{ color: "white", ml: 2, "& .MuiSelect-icon": { color: "white" } }}
          >
            <MenuItem value="fr">FR</MenuItem>
            <MenuItem value="en">EN</MenuItem>
          </Select>
          <Button color="inherit" component={Link} href="/login">{t("nav.login")}</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: "center", borderTop: "1px solid #eee", mt: 6 }}>
        <Typography variant="body2" color="text.secondary">
          © 2026 ImmoBF Africa — contact@immobf.africa
        </Typography>
        <Box sx={{ mt: 1, display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
          {[
            { key: "footer.cgu", label: t("footer.cgu") },
            { key: "footer.privacy", label: t("footer.privacy") },
            { key: "footer.legal", label: t("footer.legal") },
            { key: "footer.disclaimer", label: t("footer.disclaimer") },
          ].map(({ key, label }) => (
            <Link key={key} href="/legal" style={{ color: "#999", fontSize: 12, textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </Box>
      </Box>
    </>
  );
}
