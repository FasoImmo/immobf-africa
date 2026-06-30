import Link from "next/link";
import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import {
  AppBar, Toolbar, Typography, Button, Container, Box,
  Select, MenuItem, Menu, IconButton, Drawer, List,
  ListItem, ListItemButton, ListItemText, Divider,
  useMediaQuery, useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";

export default function Layout({ children, title = "ImmoBF Africa" }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [browseAnchor, setBrowseAnchor] = useState(null);
  const [publishAnchor, setPublishAnchor] = useState(null);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    localStorage.removeItem("immobf_refresh");
    localStorage.removeItem("immobf_user");
    setAccountAnchor(null);
    setDrawerOpen(false);
    router.push("/");
  }

  function navigate(path) {
    setDrawerOpen(false);
    router.push(path);
  }

  function changeLang(lang) {
    i18n.changeLanguage(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("immobf_lang", lang);
      window.location.reload();
    }
  }

  // ─── Tiroir mobile ────────────────────────────────────────────────────────
  const MobileDrawer = (
    <Drawer
      anchor="right"
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      PaperProps={{ sx: { width: 280, bgcolor: "#0E7C66", color: "white" } }}
    >
      {/* En-tête tiroir */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2 }}>
        <img src="/logo-white.svg" alt="ImmoBF Africa" height={36} style={{ display: "block" }} />
        <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: "white" }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {user && (
        <Box sx={{ px: 2, pb: 1 }}>
          <Typography variant="body2" sx={{ opacity: 0.8, fontSize: 12 }}>
            {user.full_name || user.phone}
          </Typography>
        </Box>
      )}

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)" }} />

      <List>
        {/* Parcourir */}
        <ListItem disablePadding>
          <ListItemButton sx={{ color: "white" }} onClick={() => navigate("/properties")}>
            <ListItemText primary={`🏠 ${t("nav.browse_all")}`} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ color: "white", pl: 4 }} onClick={() => navigate("/properties?transaction_type=sale")}>
            <ListItemText primary={`🏷️ ${t("nav.publish_sale")}`} secondary={null}
              primaryTypographyProps={{ fontSize: 14, sx: { color: "rgba(255,255,255,0.85)" } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ color: "white", pl: 4 }} onClick={() => navigate("/properties?transaction_type=rent_long")}>
            <ListItemText primary={`🔑 ${t("nav.publish_rent_long")}`}
              primaryTypographyProps={{ fontSize: 14, sx: { color: "rgba(255,255,255,0.85)" } }} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton sx={{ color: "white", pl: 4 }} onClick={() => navigate("/properties?transaction_type=rent_short")}>
            <ListItemText primary={`🌙 ${t("nav.publish_rent_short")}`}
              primaryTypographyProps={{ fontSize: 14, sx: { color: "rgba(255,255,255,0.85)" } }} />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

        {/* Publier */}
        <ListItem disablePadding>
          <ListItemButton sx={{ color: "white" }} onClick={() => navigate("/sell")}>
            <ListItemText primary={`📝 ${t("nav.publish")}`} />
          </ListItemButton>
        </ListItem>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

        {/* Compte */}
        {user ? (
          <>
            <ListItem disablePadding>
              <ListItemButton sx={{ color: "white" }} onClick={() => navigate("/account")}>
                <ListItemText primary={`📋 ${t("nav.my_listings")}`} />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton sx={{ color: "#ffcdd2" }} onClick={logout}>
                <ListItemText primary={t("nav.logout")}
                  primaryTypographyProps={{ sx: { color: "#ffcdd2" } }} />
              </ListItemButton>
            </ListItem>
          </>
        ) : (
          <ListItem disablePadding>
            <ListItemButton sx={{ color: "white" }} onClick={() => navigate("/login")}>
              <ListItemText primary={t("nav.login")} />
            </ListItemButton>
          </ListItem>
        )}

        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 1 }} />

        {/* Langue */}
        <ListItem>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small" variant={i18n.language === "fr" ? "contained" : "outlined"}
              onClick={() => changeLang("fr")}
              sx={{ color: "white", borderColor: "white", bgcolor: i18n.language === "fr" ? "rgba(255,255,255,0.2)" : "transparent" }}
            >FR</Button>
            <Button
              size="small" variant={i18n.language === "en" ? "contained" : "outlined"}
              onClick={() => changeLang("en")}
              sx={{ color: "white", borderColor: "white", bgcolor: i18n.language === "en" ? "rgba(255,255,255,0.2)" : "transparent" }}
            >EN</Button>
          </Box>
        </ListItem>
      </List>
    </Drawer>
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0E7C66" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>

      <AppBar position="sticky" color="primary">
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
          {/* Logo */}
          <Box sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              <img src="/logo-white.svg" alt="ImmoBF Africa" height={42} style={{ display: "block" }} />
            </Link>
          </Box>

          {/* ── DESKTOP ── */}
          {!isMobile && (
            <>
              {/* Parcourir */}
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

              {/* Publier */}
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

              {/* Langue */}
              <Select value={i18n.language} onChange={(e) => changeLang(e.target.value)}
                variant="standard"
                sx={{ color: "white", ml: 2, "& .MuiSelect-icon": { color: "white" } }}>
                <MenuItem value="fr">FR</MenuItem>
                <MenuItem value="en">EN</MenuItem>
              </Select>

              {/* Compte */}
              {user ? (
                <>
                  <Button color="inherit" endIcon={<AccountCircleIcon />}
                    onClick={(e) => setAccountAnchor(e.currentTarget)} sx={{ ml: 1 }}>
                    {t("nav.my_account")}
                  </Button>
                  <Menu anchorEl={accountAnchor} open={Boolean(accountAnchor)}
                    onClose={() => setAccountAnchor(null)}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}>
                    <MenuItem disabled sx={{ opacity: 0.7, fontSize: 13 }}>
                      {user.full_name || user.phone}
                    </MenuItem>
                    <MenuItem onClick={() => { setAccountAnchor(null); router.push("/account"); }}>
                      📋 {t("nav.my_listings")}
                    </MenuItem>
                    <MenuItem onClick={() => { setAccountAnchor(null); router.push("/sell?tx=sale"); }}>
                      📝 {t("nav.publish")}
                    </MenuItem>
                    <MenuItem onClick={logout} sx={{ color: "error.main" }}>
                      {t("nav.logout")}
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button color="inherit" component={Link} href="/login" sx={{ ml: 1 }}>
                  {t("nav.login")}
                </Button>
              )}
            </>
          )}

          {/* ── MOBILE : bouton hamburger ── */}
          {isMobile && (
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ ml: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Tiroir mobile */}
      {MobileDrawer}

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        {children}
      </Container>

      <Box component="footer" sx={{ py: 3, textAlign: "center", borderTop: "1px solid #eee", mt: 6 }}>
        <Box sx={{ mb: 1, display: "flex", justifyContent: "center" }}>
          <img src="/logo.svg" alt="ImmoBF Africa" height={48} style={{ display: "block" }} />
        </Box>
        <Typography variant="body2" color="text.secondary">
          © 2026 ImmoBF Africa — contact@immoafrica.online
        </Typography>
        <Box sx={{ mt: 1, display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap" }}>
          {[
            { key: "footer.cgu", label: t("footer.cgu") },
            { key: "footer.privacy", label: t("footer.privacy") },
            { key: "footer.legal", label: t("footer.legal") },
            { key: "footer.disclaimer", label: t("fo