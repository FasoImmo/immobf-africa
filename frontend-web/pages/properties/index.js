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
  const [filters, setFilters] = useState({
    q: router.query.q || "",
    city: router.query.city || "",
    type: router.query.type || "",
    min_price: "",
    max_price: "",
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function runSearch(f = filters) {
    setLoading(true);
    const params = {};
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
    try {
      const d = await Properties.search(params);
      setItems(d.items || []);
    } finally { setLoading(false); }
  }

  useEffect(() => { runSearch(filters); /* eslint-disable-next-line */ }, []);

  return (
    <Layout title="Parcourir — ImmoBF">
      <Typography variant="h4" gutterBottom>{t("nav.browse")}</Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TextField label="Recherche" size="small" value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <TextField label="Ville" size="small" value={filters.city}
          onChange={(e) => setFilters({ ...filters, city: e.target.value })} />
        <TextField select label={t("search.type")} size="small" value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })} sx={{ minWidth: 160 }}>
          <MenuItem value="">—</MenuItem>
          {["land","house","apartment","office","commercial"].map((v) => (
            <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
          ))}
        </TextField>
        <TextField label={t("search.price_min")} type="number" size="small" value={filters.min_price}
          onChange={(e) => setFilters({ ...filters, min_price: e.target.value })} />
        <TextField label={t("search.price_max")} type="number" size="small" value={filters.max_price}
          onChange={(e) => setFilters({ ...filters, max_price: e.target.value })} />
        <Button variant="contained" onClick={() => runSearch()}>{t("search.filters")}</Button>
      </Box>

      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {!loading && items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">Aucun résultat pour ces filtres.</Typography>
          </Grid>
        )}
      </Grid>
    </Layout>
  );
}
