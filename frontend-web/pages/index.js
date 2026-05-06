import { useEffect, useState } from "react";
import Link from "next/link";
import { Box, Button, Grid, Typography, Paper, TextField, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import PropertyCard from "../components/PropertyCard";
import { Properties } from "../lib/api";

export default function Home() {
  const { t } = useTranslation();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    Properties.search({ limit: 6 }).then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, []);

  return (
    <Layout title="ImmoBF Africa — accueil">
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
            label="Ville" size="small"
            value={city} onChange={(e) => setCity(e.target.value)}
            sx={{ flex: "1 1 180px" }}
          />
          <TextField
            select size="small" label={t("search.type")} value={type}
            onChange={(e) => setType(e.target.value)} sx={{ minWidth: 160 }}
          >
            <MenuItem value="">—</MenuItem>
            {["land","house","apartment","office","commercial"].map((v) => (
              <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained" color="secondary"
            component={Link}
            href={{ pathname: "/properties", query: { q, city, type } }}
          >
            {t("nav.browse")}
          </Button>
        </Box>
      </Paper>

      <Typography variant="h5" sx={{ mb: 2 }}>Annonces récentes</Typography>
      <Grid container spacing={2}>
        {items.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.id}>
            <PropertyCard property={p} />
          </Grid>
        ))}
        {items.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary">
              Aucune annonce pour l'instant. Lancez le seed backend : <code>npm run seed</code>.
            </Typography>
          </Grid>
        )}
      </Grid>
    </Layout>
  );
}
