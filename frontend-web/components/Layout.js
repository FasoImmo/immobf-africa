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
  const [browseAnchor, setBrowseAnchor] = useState(null);
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

          {/* ── Menu Parcourir ── */}
          <Button
            color="inherit"
            endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setBrowseAnchor(e.currentTarget)}
          >
            {t("nav.browse")}
          </Button>
          <Menu
            anchorEl={browseAnchor}
            open={Boolean(browseAnchor)}
            onClose={() => setBrowseAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties"); }}>
              🏠 Toutes les annonces
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=sale"); }}>
              🏷️ Vente
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=rent_long"); }}>
              🔑 Location longue durée
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=rent_short"); }}>
              🌙 Location courte durée
            </MenuItem>
          </Menu>

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
     