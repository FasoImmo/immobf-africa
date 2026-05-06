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
          <Select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            variant="standard"
            sx={{ color: "white", ml: 2, "& .MuiSelect-icon": { color: "white" } }}
          >
            <MenuItem value="fr">FR</MenuItem>
            <MenuItem value="en">EN</MenuItem>
            <MenuItem value="mos">Mooré</MenuItem>
            <MenuItem value="dyu">Dioula</MenuItem>
          </Select>
          <Button color="inherit" component={Link} href="/login">{t("nav.login")}</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {children}
      </Container>
      <Box component="footer" sx={{ py: 3, textAlign: "center", borderTop: "1px solid #eee", mt: 6 }}>
        <Typography variant="body2" color="text.secondary">
          © 2026 ImmoBF Africa — MIT License — contact@immobf.africa
        </Typography>
      </Box>
    </>
  );
}
