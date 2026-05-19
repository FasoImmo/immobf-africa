import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, LinearProgress, Chip, Stack,
  FormControlLabel, Switch, Divider
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties, Photos } from "../lib/api";

const TX_TYPES = [
  { value: "sale",       label: "Vente" },
  { value: "rent_long",  label: "Location longue duree" },
  { value: "rent_short", label: "Location courte duree / nuitee" },
];

const RENT_PERIODS = [
  { value: "monthly", label: "Par mois" },
  { value: "weekly",  label: "Par semaine" },
  { value: "nightly", label: "Par nuit" },
];

const PROP_TYPES = ["land","house","apartment","office","commercial"];

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);
  const [form, setForm] = useState({
    transaction_type: "sale",
    type: "house", title: "", description: "",
    price: "", currency: "XOF", area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", deposit_pct: 5,
    is_furnished: false, rent_period: "monthly",
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadErr, setUploadErr] = useState(null);

  function change(k) {
    return function(e) {
      var val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm(function(f) { return Object.assign({}, f, { [k]: val }); });
    };
  }

  var isRent = form.transaction_type !== "sale";
  var priceLabel = form.transaction_type === "sale" ? "Prix de vente (XOF) *"
    : form.transaction_type === "rent_short" ? "Prix / nuit ou semaine (XOF) *"
    : "Loyer mensuel (XOF) *";

  async function submitProperty(e) {
    e.preventDefault(); setErr(null); setBusy(true);
    try {
      var payload = Object.assign({}, form, {
        price: Number(form.price),
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        deposit_pct: Number(form.deposit_pct),
        is_furnished: Boolean(form.is_furnished),
        rent_period: isRent ? form.rent_period : null,
      });
      var res = await Properties.create(payload);
      await Properties.publish(res.property.id);
      setPropertyId(res.property.id);
      setStep(2);
    } catch (err) {
      setErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setBusy(false); }
  }

  var onFilePick = useCallback(function(e) {
    var picked = Array.from(e.target.files || []);
    setFiles(function(prev) { return prev.concat(picked).slice(0, 10); });
  }, []);

  var onDrop = useCallback(function(e) {
    e.preventDefault();
    var dropped = Array.from(e.dataTransfer.files || []);
    setFiles(function(prev) { return prev.concat(dropped).slice(0, 10); });
  }, []);

  function removeFile(i) { setFiles(function(f) { return f.filter(function(_, idx) { return idx !== i; }); }); }

  async function uploadFiles() {
    if (!files.length) { router.push("/properties/" + propertyId); return; }
    setUploadErr(null); setUploadProgress(10); setBusy(true);
    try {
      var result = await Photos.upload(propertyId, files);
      setUploadedCount(result.photos.length);
      setUploadProgress(100);
      setTimeout(function() { router.push("/properties/" + propertyId); }, 1200);
    } catch (err) {
      setUploadErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setBusy(false); }
  }

  return (
    <Layout title="Publier une annonce — ImmoBF">
      <Typography variant="h4" gutterBottom>Publier une annonce</Typography>

      {step === 1 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <form onSubmit={submitProperty}>
            <Grid container spacing={2}>

              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Type de transaction" value={form.transaction_type} onChange={change("transaction_type")}>
                  {TX_TYPES.map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label={t("search.type")} value={form.type} onChange={change("type")}>
                  {PROP_TYPES.map(function(v) { return <MenuItem key={v} value={v}>{t("types." + v)}</MenuItem>; })}
                </TextField>
              </Grid>

              {isRent && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth label="Periode de location" value={form.rent_period} onChange={change("rent_period")}>
                      {RENT_PERIODS.map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
                    <FormControlLabel
                      control={<Switch checked={form.is_furnished} onChange={change("is_furnished")} />}
                      label="Meuble / equipee"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Divider />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField fullWidth label="Titre *" value={form.title} onChange={change("title")} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth label="Pays (ISO-2)" value={form.country_code} onChange={change("country_code")} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={change("description")} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label={priceLabel} value={form.price} onChange={change("price")} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Superficie (m2)" value={form.area_m2} onChange={change("area_m2")} />
              </Grid>
              {form.transaction_type === "sale" && (
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth type="number" label="Acompte (%)" value={form.deposit_pct} onChange={change("deposit_pct")} />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Ville *" value={form.city} onChange={change("city")} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Adresse" value={form.address} onChange={change("address")} />
              </Grid>

              {form.type !== "land" && (
                <>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth type="number" label="Chambres" value={form.bedrooms} onChange={change("bedrooms")} />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth type="number" label="Salles de bain" value={form.bathrooms} onChange={change("bathrooms")} />
                  </Grid>
                </>
              )}
            </Grid>

            {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
            <Box sx={{ mt: 3, textAlign: "right" }}>
              <Button type="submit" variant="contained" disabled={busy}>
                Suivant : ajouter des photos
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {step === 2 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" gutterBottom>Photos et videos (optionnel)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            JPG, PNG, WebP, GIF, MP4 — 10 fichiers max, 50 MB chacun.
          </Typography>
          <Box
            onDrop={onDrop}
            onDragOver={function(e) { e.preventDefault(); }}
            onClick={function() { document.getElementById("file-input").click(); }}
            sx={{
              border: "2px dashed #0E7C66", borderRadius: 2, p: 4,
              textAlign: "center", cursor: "pointer",
              bgcolor: "rgba(14,124,102,0.04)",
              "&:hover": { bgcolor: "rgba(14,124,102,0.08)" }
            }}
          >
            <Typography>Glissez vos fichiers ici ou cliquez pour selectionner</Typography>
            <input id="file-input" type="file" multiple
              accept="image/*,video/mp4,video/quicktime,video/webm"
              style={{ display: "none" }} onChange={onFilePick} />
          </Box>

          {files.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
              {files.map(function(f, i) {
                return <Chip key={i} label={f.name} onDelete={function() { removeFile(i); }} />;
              })}
            </Stack>
          )}

          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              {uploadProgress === 100 && (
                <Typography color="success.main" sx={{ mt: 1 }}>
                  {uploadedCount} fichier(s) uploade(s) — redirection...
                </Typography>
              )}
            </Box>
          )}

          {uploadErr && <Alert severity="error" sx={{ mt: 2 }}>{uploadErr}</Alert>}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" onClick={function() { router.push("/properties/" + propertyId); }} disabled={busy}>
              Passer cette etape
            </Button>
            <Button variant="contained" onClick={uploadFiles} disabled={busy}>
              {files.length ? "Uploader et publier" : "Terminer sans photo"}
            </Button>
          </Box>
        </Paper>
      )}
    </Layout>
  );
}
