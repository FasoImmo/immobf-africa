import { useState } from "react";
import { useRouter } from "next/router";
import { Box, Paper, TextField, Button, Typography, MenuItem, Alert, Grid } from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties } from "../lib/api";

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [form, setForm] = useState({
    type: "house", title: "", description: "",
    price: "", currency: "XOF", area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", deposit_pct: 5,
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  function change(k) { return (e) => setForm({ ...form, [k]: e.target.value }); }

  async function submit(e) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        deposit_pct: Number(form.deposit_pct),
      };
      const { property } = await Properties.create(payload);
      await Properties.publish(property.id);
      router.push(`/properties/${property.id}`);
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  return (
    <Layout title="Publier une annonce — ImmoBF">
      <Typography variant="h4" gutterBottom>Publier une annonce</Typography>
      <Paper sx={{ p: 3 }} elevation={1}>
        <form onSubmit={submit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t("search.type")} value={form.type} onChange={change("type")}>
                {["land","house","apartment","office","commercial"].map((v) => (
                  <MenuItem key={v} value={v}>{t(`types.${v}`)}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Pays (ISO-2)" value={form.country_code} onChange={change("country_code")} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Titre" value={form.title} onChange={change("title")} required />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={change("description")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Prix" value={form.price} onChange={change("price")} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Superficie (m²)" value={form.area_m2} onChange={change("area_m2")} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label="Acompte (%)" value={form.deposit_pct} onChange={change("deposit_pct")} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Ville" value={form.city} onChange={change("city")} required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Adresse" value={form.address} onChange={change("address")} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth type="number" label="Chambres" value={form.bedrooms} onChange={change("bedrooms")} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth type="number" label="Sdb" value={form.bathrooms} onChange={change("bathrooms")} />
            </Grid>
          </Grid>

          {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
          <Box sx={{ mt: 3, textAlign: "right" }}>
            <Button type="submit" variant="contained" disabled={busy}>
              Publier l'annonce
            </Button>
          </Box>
        </form>
      </Paper>
    </Layout>
  );
}
