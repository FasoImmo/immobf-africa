import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Grid, TextField, MenuItem, Typography, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PropertyCard from "../../components/PropertyCard";
import { Properties } from "../../lib/api";

export default function BrowsePage() {
  const router = useRouter();
  const { t } = useTranslation();

  const TX_OPTIONS = [
    { value: "",           label: t("browse.all") },
    { value: "sale",       label: t("nav.publish_sale") },
    { value: "rent_long",  label: t("nav.publish_rent_long") },
    { value: "rent_short", label: t("nav.publish_rent_short") },
  ];

  const TX_TITLES = {
    "":           t("browse.title_all"),
    "sale":       t("browse.title_sale"),
    "rent_long":  t("browse.title_rent_long"),
    "rent_short": t("browse.title_rent_short"),
  };
  const [filters, setFilters] = useState({
    q: "", city: "", type: "", transaction_type: "", min_price: "", max_price: "",
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Lire les query params depuis window.location au montage (évite les problèmes
  // de timing avec router.isReady et les re-renders i18n)
  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    const f = {
      q:                params.get("q")                || "",
      city:             params.get("city")             || "",
      type:             params.get("type")             || "",
      transaction_type: params.get("transaction_type") || "",
      min_price:        params.get("min_price")        || "",
      max_price:        params.get("max_price")        || "",
    };
    setFilters(f);
    setReady(true);
    runSearch(f);
  }, []); // eslint-disable-line

  async function runSearch(f) {
    const current = f || filters;
    setLoading(true);
    const params = {};
    Object.entries(current).forEach(([k, v]) => { if (v) params[k] = v; });
    try {
      const d = await Properties.search(params);
      setItems(d.items || []);
    } finally { setLoading(false); }
  }

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const pageTitle = TX_TITLES[filters.transaction_type] || t("browse.title_all");

  return (
    <Layout title={pageTitle + " — ImmoBF"}>
      <Typography variant="h4" gutterBottom>{pageTitle}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField label={t("search.placeholder")} size="small" value={filters.q} onChange={set("q")} />
        <TextField label={t("search.city") || "Ville"} size="small" value={filters.city} onChange={set("city")} />
        <TextField select label="Transaction" size="small" value={filters.transaction_type}
          onChange={set("transaction_type")} sx={{ minWidth: 210 }}>
          {TX_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
          ))}
        </TextField>
        <TextField select label={t("search.type")} size="small" value={filters.type}
          onChange={set("type")} sx={{ minWidth: 160 }}>
          <MenuItem value="">—</MenuItem>
          {["land","house","apartment","office","commercial"].map((v) => (
            <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
          ))}
        </TextField>
        <TextField label={t("search.price_min")} type="number" size="small"
          value={filters.min_price} onChange={set("min_price")} />
        <TextField label={t("search.price_max")} type="number" size="small"
          value={filters.max_price} onChange={set("max_price")} />
        <Button variant="contained" onClick={() => runSearch()}>{t("search.filters")}</Button>
      </Box>

      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {!loading && ready && items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">{t("search.no_results") || "Aucun résultat pour ces filtres."}</Typography>
          </Grid>
        )}
      </Grid>
    </Layout>
  );
}
