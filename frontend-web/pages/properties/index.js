import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Grid, TextField, MenuItem, Typography, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PropertyCard from "../../components/PropertyCard";
import { Properties } from "../../lib/api";

const TX_OPTIONS = [
  { value: "",           label: "Vente & Location" },
  { value: "sale",       label: "Vente" },
  { value: "rent_long",  label: "Location longue durée" },
  { value: "rent_short", label: "Location courte durée / nuitée" },
];

const TX_TITLES = {
  "":           "Parcourir les annonces",
  "sale":       "Annonces à vendre",
  "rent_long":  "Locations longue durée",
  "rent_short": "Locations courte durée / nuitée",
};

export default function BrowsePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    q: "", city: "", type: "", transaction_type: "", min_price: "", max_price: "",
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Lire les query params après hydratation Next.js (router.isReady)
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    const f = {
      q:                q.q                || "",
      city:             q.city             || "",
      type:             q.type             || "",
      transaction_type: q.transaction_type || "",
      min_price:        q.min_price        || "",
      max_price:        q.max_price        || "",
    };
    setFilters(f);
    setReady(true);
    runSearch(f);
  }, [router.isReady, router.asPath]); // eslint-disable-line

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
  const pageTitle = TX_TITLES[filters.transaction_type] || "Parcourir les annonces";

  return (
    <Layout title={pageTitle + " — ImmoBF"}>
      <Typography variant="h4" gutterBottom>{pageTitle}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField label="Recherche" size="small" value={filters.q} onChange={set("q")} />
        <TextField label="Ville" size="small" value={filters.city} onChange={set("city")} />
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
          value={filters.max_price} o