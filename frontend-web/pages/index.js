import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Grid, Typography, Paper, TextField, MenuItem, Divider, Chip, Alert, Skeleton } from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import SeoHead from "../components/SeoHead";
import PropertyCard from "../components/PropertyCard";
import { Properties, Analytics } from "../lib/api";
import api from "../lib/api";
import { AFRICAN_COUNTRIES } from "../lib/africanCountries";

const ldHomeBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: "https://www.immoafrica.online" },
  ],
};

export default function Home({ initialItems = null }) {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [txType, setTxType] = useState("");
  // null = chargement en cours ; tableau = annonces reçues (éventuellement vide)
  const [items, setItems] = useState(initialItems);
  const [itemsError, setItemsError] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [suggestContext, setSuggestContext] = useState(null);
  const [nlEmail, setNlEmail] = useState("");
  const [nlDone, setNlDone] = useState(false);
  const [nlLoading, setNlLoading] = useState(false);

  useEffect(() => {
    // Annonces récentes
    Properties.search({ limit: 6 })
      .then((d) => { setItems(d.items || []); setItemsError(false); })
      .catch(() => {
        // On garde les annonces rendues côté serveur ; erreur affichée seulement s'il n'y a rien.
        setItems((prev) => {
          if (!prev || prev.length === 0) setItemsError(true);
          return prev || [];
        });
      });

    if (typeof window === "undefined") return;

    // Session ID
    const sid = sessionStorage.getItem("immobf_sid") || (() => {
      const s = Math.random().toString(36).slice(2);
      sessionStorage.setItem("immobf_sid", s);
      return s;
    })();

    // Suggestions personnalisées basées sur l'historique de recherche
    Analytics.suggestions(sid).then((r) => {
      if (r.items && r.items.length > 0) {
        setSuggestions(r.items);
        setSuggestContext(r.based_on);
      }
    }).catch(() => {});

    // Annonces récemment consultées
    try {
      const recentIds = JSON.parse(localStorage.getItem("immobf_recent") || "[]");
      if (recentIds.length > 0) {
        Promise.all(
          recentIds.slice(0, 3).map((id) =>
            Properties.get(id).then((d) => d.property).catch(() => null)
          )
        ).then((results) => setRecentItems(results.filter(Boolean)));
      }
    } catch (_) {}
  }, []);

  // Libellé du contexte de personnalisation
  function contextLabel(ctx) {
    if (!ctx) return "";
    const parts = [];
    if (ctx.cities?.length) parts.push(ctx.cities.join(", "));
    if (ctx.types?.length) parts.push(ctx.types.map((t) => t).join(", "));
    return parts.length ? `${t("home.based_on")} : ${parts.join(" · ")}` : t("home.based_on");
  }

  return (
    <Layout title="ImmoBF Africa — Immobilier en Afrique de l'Ouest">
      <SeoHead
        title="Immobilier en Afrique de l'Ouest — Achat, Location, Vente"
        description="Trouvez un appartement, une villa, un terrain ou un local commercial au Burkina Faso, Côte d'Ivoire, Sénégal et dans toute la zone UEMOA. Paiement Orange Money, Moov Money, Wave."
        jsonLd={[ldHomeBreadcrumb]}
      />
      {/* ── Hero / Barre de recherche ── */}
      <Paper elevation={0} sx={{ p: 4, mb: 4, background: "linear-gradient(135deg,#0E7C66,#13a48c)", color: "white" }}>
        <Typography variant="h3" gutterBottom>{t("app_name")}</Typography>
        <Typography variant="h6" gutterBottom>{t("tagline")}</Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 3, bgcolor: "white", p: 2, borderRadius: 2 }}>
          <TextField
            label={t("search.placeholder")} size="small"
            value={q} onChange={(e) => setQ(e.target.value)}
            sx={{ flex: "1 1 220px" }}
          />
          <TextField
            select size="small" label={t("search.country")} value={country}
            onChange={(e) => setCountry(e.target.value)} sx={{ minWidth: 170 }}
          >
            <MenuItem value="">{t("search.all_countries")}</MenuItem>
            {AFRICAN_COUNTRIES.map((c) => (
              <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label={t("search.city")} size="small"
            value={city} onChange={(e) => setCity(e.target.value)}
            sx={{ flex: "1 1 160px" }}
          />
          <TextField
            select size="small" label="Transaction" value={txType}
            onChange={(e) => setTxType(e.target.value)} sx={{ minWidth: 190 }}
          >
            <MenuItem value="">{t("browse.all")}</MenuItem>
            <MenuItem value="sale">{t("nav.publish_sale")}</MenuItem>
            <MenuItem value="rent_long">{t("nav.publish_rent_long")}</MenuItem>
            <MenuItem value="rent_short">{t("nav.publish_rent_short")}</MenuItem>
          </TextField>
          <TextField
            select size="small" label={t("search.type")} value={type}
            onChange={(e) => setType(e.target.value)} sx={{ minWidth: 150 }}
          >
            <MenuItem value="">—</MenuItem>
            {["land","house","apartment","office","commercial"].map((v) => (
              <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained" color="secondary"
            component={Link}
            href={{ pathname: "/properties", query: { q, country, city, type, transaction_type: txType } }}
          >
            {t("nav.browse")}
          </Button>
        </Box>
      </Paper>

      {/* ── Suggestions personnalisées ── */}
      {suggestions.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="h5">✨ Pour vous</Typography>
            <Chip
              size="small"
              label={contextLabel(suggestContext)}
              color="primary"
              variant="outlined"
              sx={{ fontSize: 11 }}
            />
          </Box>
          <Grid container spacing={2}>
            {suggestions.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <PropertyCard property={p} />
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 4 }} />
        </Box>
      )}

      {/* ── Récemment consultés ── */}
      {recentItems.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>🕐 Récemment consultés</Typography>
          <Grid container spacing={2}>
            {recentItems.map((p) => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <PropertyCard property={p} />
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ mt: 4 }} />
        </Box>
      )}

      {/* ── Annonces récentes ── */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        {suggestions.length > 0 ? t("home.recent_all") : t("browse.title_all")}
      </Typography>
      <Grid container spacing={2}>
        {items === null && [0, 1, 2, 3, 4, 5].map((i) => (
          <Grid item xs={12} sm={6} md={4} key={`sk-${i}`}>
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
            <Skeleton width="80%" sx={{ mt: 1 }} />
            <Skeleton width="50%" />
          </Grid>
        ))}
        {(items || []).map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {items !== null && items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">
              {itemsError ? t("home.listings_error") : t("home.no_listings")}
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* ── App mobile ── */}
      <Paper elevation={0} sx={{
        mt: 4, mb: 4, p: { xs: 3, md: 4 }, borderRadius: 3,
        background: "#f0faf6",
        display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap",
      }}>
        <Box sx={{ fontSize: 48, lineHeight: 1 }}>📱</Box>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={700}>{t("home.app_title")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("home.app_desc")}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", flexShrink: 0 }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AndroidIcon />}
            href="https://play.google.com/store/apps/details?id=africa.immobf.app"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 700, px: 2.5, bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0a6355" } }}
          >
            Google Play
          </Button>
          <Button
            variant="outlined"
            size="medium"
            startIcon={<PhoneIphoneIcon />}
            href="https://apps.apple.com/app/id6809453557"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ fontWeight: 700, px: 2.5, borderColor: "#0E7C66", color: "#0E7C66", "&:hover": { bgcolor: "#f0faf6" } }}
          >
            App Store
          </Button>
        </Box>
      </Paper>

      {/* ── Newsletter ── */}
      <Paper elevation={0} sx={{
        mt: 6, p: 4, textAlign: "center",
        background: "linear-gradient(135deg,#0E7C66,#13a48c)", color: "white", borderRadius: 3,
      }}>
        <Typography variant="h5" gutterBottom>{t("home.nl_title")}</Typography>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
          {t("home.nl_subtitle")}
        </Typography>
        {nlDone ? (
          <Alert severity="success" sx={{ maxWidth: 400, mx: "auto" }}>
            {t("home.nl_done")}
          </Alert>
        ) : (
          <Box sx={{ display: "flex", gap: 1, maxWidth: 420, mx: "auto", flexWrap: "wrap" }}>
            <TextField
              fullWidth size="small" placeholder={t("home.nl_email")}
              value={nlEmail} onChange={(e) => setNlEmail(e.target.value)}
              sx={{ bgcolor: "white", borderRadius: 1, flex: "1 1 200px" }}
              inputProps={{ type: "email" }}
            />
            <Button
              variant="contained" color="secondary"
              disabled={nlLoading || !nlEmail}
              onClick={async () => {
                setNlLoading(true);
                try {
                  await api.post("/newsletter/subscribe", { email: nlEmail });
                  setNlDone(true);
                } catch (_) {}
                setNlLoading(false);
              }}
            >
              {nlLoading ? "…" : t("home.nl_subscribe")}
            </Button>
          </Box>
        )}
      </Paper>
    </Layout>
  );
}

// Rendu statique incrémental : les 6 annonces récentes sont présentes dans le HTML
// (robots, aperçus WhatsApp/Facebook/LinkedIn), puis rafraîchies côté client.
export async function getStaticProps({ locale }) {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let initialItems = null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `${base}/api/v1/properties?limit=6&lang=${encodeURIComponent(locale || "fr")}`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (res.ok) {
      const d = await res.json();
      initialItems = Array.isArray(d.items) ? d.items : [];
    }
  } catch (_) {
    // API injoignable au build : la page s'affiche avec le squelette puis charge côté client.
  }
  return { props: { initialItems }, revalidate: 300 };
}
