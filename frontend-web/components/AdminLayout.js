"use client";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Typography, IconButton, AppBar, Toolbar, Divider, Avatar, Tooltip, Chip,
  useMediaQuery, useTheme, CircularProgress, Paper,
} from "@mui/material";
import DashboardRoundedIcon    from "@mui/icons-material/DashboardRounded";
import TrendingUpIcon          from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon         from "@mui/icons-material/ReceiptLong";
import ApartmentIcon           from "@mui/icons-material/Apartment";
import PeopleRoundedIcon       from "@mui/icons-material/PeopleRounded";
import ContactMailIcon         from "@mui/icons-material/ContactMail";
import MarkEmailReadIcon       from "@mui/icons-material/MarkEmailRead";
import StarRoundedIcon         from "@mui/icons-material/StarRounded";
import TuneIcon                from "@mui/icons-material/Tune";
import ManageAccountsIcon      from "@mui/icons-material/ManageAccounts";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import BarChartIcon             from "@mui/icons-material/BarChart";
import VerifiedIcon             from "@mui/icons-material/Verified";
import HomeRoundedIcon         from "@mui/icons-material/HomeRounded";
import LogoutIcon              from "@mui/icons-material/Logout";
import MenuIcon                from "@mui/icons-material/Menu";
import AdminPanelSettingsIcon  from "@mui/icons-material/AdminPanelSettings";

const SIDEBAR_W   = 248;
const C_BG        = "#0F172A";   // slate-900
const C_ACTIVE    = "#0E7C66";   // brand teal
const C_HOVER     = "rgba(255,255,255,0.06)";
const C_TEXT      = "rgba(255,255,255,0.87)";
const C_MUTED     = "rgba(255,255,255,0.42)";
const C_DIVIDER   = "rgba(255,255,255,0.09)";

const NAV = [
  { label: "Tableau de bord",  href: "/admin",               icon: <DashboardRoundedIcon   fontSize="small" />, exact: true },
  { label: "Revenus",          href: "/admin/revenues",       icon: <TrendingUpIcon         fontSize="small" /> },
  { label: "Transactions",     href: "/admin/transactions",   icon: <ReceiptLongIcon        fontSize="small" /> },
  { label: "Annonces",         href: "/admin/properties",     icon: <ApartmentIcon          fontSize="small" /> },
  { label: "Utilisateurs",     href: "/admin/users",          icon: <PeopleRoundedIcon      fontSize="small" /> },
  { label: "Contacts / CRM",   href: "/admin/contacts",       icon: <ContactMailIcon        fontSize="small" /> },
  { label: "Newsletter",       href: "/admin/newsletter",     icon: <MarkEmailReadIcon      fontSize="small" /> },
  { label: "Avis & Notes",        href: "/admin/reviews",           icon: <StarRoundedIcon           fontSize="small" /> },
  { label: "Fournisseurs paiement", href: "/admin/payment-providers", icon: <AccountBalanceWalletIcon  fontSize="small" /> },
  { label: "Stats par mode",        href: "/admin/payment-stats",    icon: <BarChartIcon              fontSize="small" /> },
  { label: "Qualité annonces",      href: "/admin/listing-quality",  icon: <VerifiedIcon              fontSize="small" /> },
  { label: "Paramètres",          href: "/admin/settings",          icon: <TuneIcon                  fontSize="small" /> },
  { label: "Profil",           href: "/admin/profile",        icon: <ManageAccountsIcon     fontSize="small" /> },
];

function NavItem({ item, router, onClick }) {
  const isActive = item.exact
    ? router.pathname === item.href
    : router.pathname.startsWith(item.href);
  return (
    <ListItem disablePadding sx={{ mb: 0.25 }}>
      <ListItemButton
        component={Link}
        href={item.href}
        onClick={onClick}
        sx={{
          borderRadius: 1.5,
          py: 0.85,
          px: 1.5,
          bgcolor: isActive ? C_ACTIVE : "transparent",
          "&:hover": { bgcolor: isActive ? C_ACTIVE : C_HOVER },
          transition: "background 0.15s",
        }}
      >
        <ListItemIcon sx={{ color: isActive ? "#fff" : C_MUTED, minWidth: 34 }}>
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            fontSize: 13.5,
            fontWeight: isActive ? 600 : 400,
            color: isActive ? "#fff" : C_TEXT,
          }}
        />
      </ListItemButton>
    </ListItem>
  );
}

function Sidebar({ router, user, onLogout, onClose }) {
  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: C_BG, overflowY: "auto" }}>
      {/* Logo + badge */}
      <Box sx={{ px: 2.5, py: 2.5, display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
        <AdminPanelSettingsIcon sx={{ color: C_ACTIVE, fontSize: 28 }} />
        <Box>
          <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
            ImmoBF Africa
          </Typography>
          <Typography sx={{ color: C_MUTED, fontSize: 11 }}>Administration</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: C_DIVIDER, mx: 1.5, mb: 1 }} />

      {/* Navigation principale */}
      <List sx={{ flex: 1, px: 1.5, py: 0.5 }}>
        {NAV.map((item) => (
          <NavItem key={item.href} item={item} router={router} onClick={onClose} />
        ))}
      </List>

      <Divider sx={{ borderColor: C_DIVIDER, mx: 1.5, mb: 1 }} />

      {/* Retour au site */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <ListItemButton
          component={Link}
          href="/"
          onClick={onClose}
          sx={{ borderRadius: 1.5, py: 0.85, px: 1.5, "&:hover": { bgcolor: C_HOVER } }}
        >
          <ListItemIcon sx={{ color: C_MUTED, minWidth: 34 }}>
            <HomeRoundedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Retour au site"
            primaryTypographyProps={{ fontSize: 13, color: C_MUTED }}
          />
        </ListItemButton>
      </Box>

      {/* Info utilisateur */}
      <Box
        sx={{
          px: 2, pb: 2, pt: 1.5,
          display: "flex", alignItems: "center", gap: 1.5,
          borderTop: `1px solid ${C_DIVIDER}`,
        }}
      >
        <Avatar
          sx={{ width: 32, height: 32, bgcolor: C_ACTIVE, fontSize: 14, fontWeight: 700, flexShrink: 0 }}
        >
          {(user?.full_name || "A")[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              color: C_TEXT, fontSize: 13, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {user?.full_name || "Administrateur"}
          </Typography>
          <Typography sx={{ color: C_MUTED, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.email || user?.phone || ""}
          </Typography>
        </Box>
        <Tooltip title="Déconnexion">
          <IconButton size="small" onClick={onLogout} sx={{ color: C_MUTED, "&:hover": { color: "#ef4444" } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

export default function AdminLayout({ children, title = "Admin — ImmoBF Africa" }) {
  const router   = useRouter();
  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [user,        setUser]        = useState(null);
  const [authorized,  setAuthorized]  = useState(null); // null=loading, true=ok, false=denied

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) { router.replace("/login?redirect=" + router.pathname); return; }
    let u = null;
    try { u = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!u || u.role !== "admin") { setAuthorized(false); return; }
    setUser(u);
    setAuthorized(true);
  }, []); // eslint-disable-line

  function logout() {
    localStorage.removeItem("immobf_token");
    localStorage.removeItem("immobf_refresh");
    localStorage.removeItem("immobf_user");
    router.push("/login");
  }

  const pageLabel = NAV.find((n) =>
    n.exact ? router.pathname === n.href : router.pathname.startsWith(n.href)
  )?.label ?? "Administration";

  // ── Chargement ────────────────────────────────────────────────────────────
  if (authorized === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
        <CircularProgress sx={{ color: C_ACTIVE }} />
      </Box>
    );
  }

  // ── Accès refusé ──────────────────────────────────────────────────────────
  if (authorized === false) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#F8FAFC" }}>
        <Paper sx={{ p: 5, textAlign: "center", borderRadius: 3, maxWidth: 360 }}>
          <AdminPanelSettingsIcon sx={{ fontSize: 48, color: "#CBD5E1", mb: 2 }} />
          <Typography variant="h6" fontWeight={700} gutterBottom>Accès réservé</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>Cette section est réservée aux administrateurs.</Typography>
          <Link href="/" style={{ color: C_ACTIVE, fontWeight: 600 }}>← Retour au site</Link>
        </Paper>
      </Box>
    );
  }

  const sidebarContent = (
    <Sidebar router={router} user={user} onLogout={logout} onClose={() => setDrawerOpen(false)} />
  );

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#F1F5F9" }}>
        {/* ── Sidebar desktop fixe ──────────────────────────────────────── */}
        {!isMobile && (
          <Box
            sx={{
              width: SIDEBAR_W, flexShrink: 0,
              "& > div": { position: "fixed", top: 0, left: 0, width: SIDEBAR_W, height: "100vh" },
            }}
          >
            <Box>{sidebarContent}</Box>
          </Box>
        )}

        {/* ── Drawer mobile ────────────────────────────────────────────── */}
        {isMobile && (
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            PaperProps={{ sx: { width: SIDEBAR_W } }}
          >
            {sidebarContent}
          </Drawer>
        )}

        {/* ── Contenu principal ────────────────────────────────────────── */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Top bar */}
          <AppBar
            position="sticky"
            elevation={0}
            sx={{ bgcolor: "#fff", borderBottom: "1px solid #E2E8F0", color: "text.primary", zIndex: 1100 }}
          >
            <Toolbar sx={{ minHeight: { xs: 56, sm: 60 }, gap: 1 }}>
              {isMobile && (
                <IconButton onClick={() => setDrawerOpen(true)} edge="start" sx={{ mr: 0.5 }}>
                  <MenuIcon />
                </IconButton>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: 11, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Administration
                </Typography>
                <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.1, fontSize: { xs: 16, sm: 19 }, color: "#0F172A" }}>
                  {pageLabel}
                </Typography>
              </Box>

              <Chip
                label={new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                size="small"
                sx={{
                  display: { xs: "none", sm: "flex" },
                  bgcolor: "#F1F5F9", color: "#64748B",
                  fontSize: 12, fontWeight: 500,
                  border: "1px solid #E2E8F0",
                }}
              />

              <Tooltip title="Retour au site">
                <IconButton component={Link} href="/" size="small" sx={{ color: "#64748B", ml: 0.5 }}>
                  <HomeRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>

          {/* Page content */}
          <Box sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </>
  );
}
