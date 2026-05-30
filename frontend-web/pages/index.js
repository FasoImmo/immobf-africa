import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Grid, Typography, Paper, TextField, MenuItem, Divider, Chip } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import PropertyCard from "../components/PropertyCard";
import { Properties, Analytics } from "../lib/api";

export default function Home() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [txType, setTxType] = useState("");
  const [items, setItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [suggestContext, setSuggestContext] = useState(null);

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
    return parts.length ? `Basé sur vos recherches : ${parts.join(" · ")}` : "Basé sur vos recherches";
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
            href={{ pathname: "/properties", query: { q, city, type, transaction_type: txType } }}
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
        {suggestions.length > 0 ? "Toutes les annonces récentes" : t("browse.title_all")}
      </Typography>
      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">
              Aucune annonce pour l'instant.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Layout>
  );
}
