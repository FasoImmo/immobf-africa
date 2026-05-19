import Link from "next/link";
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { AppBar, Toolbar, Typography, Button, Container, Box, Select, MenuItem, Menu } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

export default function Layout({ children, title = "ImmoBF Africa" }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [rentAnchor, setRentAnchor] = useState(null);

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

          {/* ── Menu Louer ── */}
          <Button
            color="inherit"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setRentAnchor(e.currentTarget)}
          >
            Louer
          </Button>
          <Menu
            anchorEl={rentAnchor}
            open={Boolean(rentAnchor)}
            onClose={() => setRentAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MenuItem onClick={() => { setRentAnchor(null); router.push("/properties?transaction_type=rent_long"); }}>
              🔑 Location longue durée
            </MenuItem>
            <MenuItem onClick={() => { setRentAnchor(null); router.push("/properties?transaction_type=rent_short"); }}>
              🌙 Courte durée / nuitée
            </MenuItem>
          </Menu>
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
          <Butto