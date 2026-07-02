import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Grid, Typography, Paper, TextField, MenuItem, Divider, Chip, Alert } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import PropertyCard from "../components/PropertyCard";
import { Properties, Analytics } from "../lib/api";
import api from "../lib/api";
import { AFRICAN_COUNTRIES } from "../lib/africanCountries";

export default function Home() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [txType, setTxType] = useState("");
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [suggestContext, setSuggestContext] = useState(null);
  const [nlEmail, setNlEmail] = useState("");
  const [nlDone, setNlDone] = useState(false);
  const [nlLoading, setNlLoading] = useState(false);

  useEffect(() => {
    // Annonces récentes
    Properties.search({ limit: 6 })
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));

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
    <Layout title="ImmoBF Africa — accueil">
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
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">{t("home.no_listings")}</Typography>
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
        <Button
          variant="contained" color="primary" component={Link} href="/download"
          sx={{ fontWeight: 700, px: 3, flexShrink: 0 }}
        >
          {t("home.app_download")}
        </Button>
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
