import Link from "next/link";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import { AppBar, Toolbar, Typography, Button, Container, Box, Select, MenuItem, Menu } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function Layout({ children, title = "ImmoBF Africa" }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [browseAnchor, setBrowseAnchor] = useState(null);
  const [publishAnchor, setPublishAnchor] = useState(null);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("immobf_user");
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch (_) {}
      }
    }
  }, []);

  function logout() {
    localStorage.removeItem("immobf_token");
    localStorage.removeItem("immobf_user");
    setAccountAnchor(null);
    router.push("/");
  }

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
          <Button color="inherit" endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setBrowseAnchor(e.currentTarget)}>
            {t("nav.browse")}
          </Button>
          <Menu anchorEl={browseAnchor} open={Boolean(browseAnchor)}
            onClose={() => setBrowseAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties"); }}>
              🏠 {t("nav.browse_all")}
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=sale"); }}>
              🏷️ {t("nav.publish_sale")}
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=rent_long"); }}>
              🔑 {t("nav.publish_rent_long")}
            </MenuItem>
            <MenuItem onClick={() => { setBrowseAnchor(null); router.push("/properties?transaction_type=rent_short"); }}>
              🌙 {t("nav.publish_rent_short")}
            </MenuItem>
          </Menu>

          {/* ── Menu Publier une annonce ── */}
          <Button color="inherit" endIcon={<KeyboardArrowDownIcon />}
            onClick={(e) => setPublishAnchor(e.currentTarget)}>
            {t("nav.publish")}
          </Button>
          <Menu anchorEl={publishAnchor} open={Boolean(publishAnchor)}
            onClose={() => setPublishAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}>
            <MenuItem onClick={() => { setPublishAnchor(null); router.push("/sell?tx=sale"); }}>
              🏷️ {t("nav.publish_sale")}
            </MenuItem>
            <MenuItem onClick={() => { setPublishAnchor(null); router.push("/sell?tx=rent_long"); }}>
              🔑 {t("nav.publish_rent_long")}
            </MenuItem>
            <MenuItem onClick={() => { setPublishAnchor(null); router.push("/sell?tx=rent_short"); }}>
              🌙 {t("nav.publish_rent_short")}
            </MenuItem>
          </Menu>

          {/* ── Langue ── */}
          <Select value={i18n.language}
            onChange={(e) => {
              const lang = e.target.value;
              i18n.changeLanguage(lang);
              if (typeof window !== "undefined") {
                localStorage.setItem("immobf_lang", lang);
                window.location.reload();
              }
            }}
            variant="standard"
            sx={{ color: "white", ml: 2, "& .MuiSelect-icon": { color: "white" } }}>
            <MenuItem value="fr">FR</MenuItem>
            <MenuItem value="en">EN</MenuItem>
          </Select>

          {/* ── Connexion / Mon compte ── */}
          {user ? (
            <>
              <Button color="inherit" endIcon={<AccountCircleIcon />}
                onClick={(e) => setAccountAnchor(e.currentTarget)}
                sx={{ ml: 1 }}>
                Mon compte
              </Button>
              <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)}
                onClose={() => setAccountAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}>
                <MenuItem disabled sx={{ opacity: 0.7, fontSize: 13 }}>
                  {user.full_name || user.phone}
                </MenuItem>
                <MenuItem onClick={() => { setAccountAnchor(null); router.push("/sell?tx=sale"); }}>
                  📝 {t("nav.publish")}
                </MenuItem>
                <MenuItem onClick={logout} sx={{ color: "error.main" }}>
                  Déconnexion
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" component={Link} href="/login" sx={{ ml: 1 }}>
              {t("nav.login")}
            </Button>
          )}
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
