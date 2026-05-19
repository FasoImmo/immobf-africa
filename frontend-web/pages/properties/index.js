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
  useEffect(function() {
    if (!router.isReady) return;
    var q = router.query;
    var f = {
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
  }, [router.isReady, router.asPath]); // router.asPath change à chaque navigation

  async function runSearch(f) {
    var current = f || filters;
    setLoading(true);
    var params = {};
    Object.entries(current).forEach(function(kv) { if (kv[1]) params[kv[0]] = kv[1]; });
    try {
      var d = await Properties.search(params);
      setItems(d.items || []);
    } finally { setLoading(false); }
  }

  var pageTitle = TX_TITLES[filters.transaction_type] || "Parcourir les annonces";

  return (
    <Layout title={pageTitle + " — ImmoBF"}>
      <Typography variant="h4" gutterBottom>{pageTitle}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField label="Recherche" size="small" value={filters.q}
          onChange={function(e) { setFilters(function(f) { return Object.assign({}, f, { q: e.target.value }); })} />
        <TextField label="Ville" size="small" value={filters.city}
          onChange={function(e) { setFilters(function(f) { return Object.assign({}, f, { city: e.target.value }); })} />
        <TextField select label="Transaction" size="small" value={filters.transaction_type}
          onChange={function(e) { setFilters(function(f) { return Object.assign({}, f, { transaction_type: e.target.value }); })}
          sx={{ minWidth: 210 }}>
          {TX_OPTIONS.map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
        </TextField>
        <TextField select label={t("search.type")} size="small" value={filters.type}
          onChange={function(e) { setFilters(function(f) { return Object.assign({}, f, { type: e.target.value }); })}
          sx={{ minWidth: 160 }}>
          <MenuItem value="">—</MenuItem>
          {["land","house","apartment","office","commercial"].map(function(v) {
            return <MenuItem key={v} val