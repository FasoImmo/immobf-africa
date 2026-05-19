import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, LinearProgress, Chip, Stack
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties, Photos } from "../lib/api";

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);
  const [form, setForm] = useState({
    type: "house", title: "", description: "",
    price: "", currency: "XOF", area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", deposit_pct: 5,
  });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadErr, setUploadErr] = useState(null);

  function change(k) { return (e) => setForm({ ...form, [k]: e.target.value }); }

  async function submitProperty(e) {
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
      setPropertyId(property.id);
      setStep(2);
    } catch (e) {
      setErr(e?.response?.data?.error?.message || e.message);
    } finally { setBusy(false); }
  }

  const onFilePick = useCallback((e) => {
    const picked = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...picked].slice(0, 10));
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []);
    setFiles((prev) => [...prev, ...dropped].slice(0, 10));
  }, []);

  function removeFile(i) { setFiles((f) => f.filter((_, idx) => idx !== i)); }

  async function uploadFiles() {
    if (!files.length) { router.push("/properties/" + propertyId); return; }
    setUploadErr(null); setUploadProgress(0); setBusy(true);
    try {
      const { photos } = await Photos.upload(propertyId, files);
      setUploadedPhotos(photos);
      setUploadProgress(100);
      setTimeout(() => router.push("/properties/" + propertyId), 1200);
    } catch (e) {
      setUploadErr(e?.response?.data?.error?.message || e.message);
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
                <TextField select fullWidth label={t("search.type")} value={form.type} onChange={change("type")}>
                  {["land","house","apartment","office","commercial"].map((v) => (
                    <MenuItem key={v} value={v}>{t("types." + v)}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Pays (ISO-2)" value={form.country_code} onChange={change("country_code")} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Titre *" value={form.title} onChange={change("title")} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label="Description" value={form.description} onChange={change("description")} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Prix *" value={form.price} onChange={change("price")} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Superficie (m²)" value={form.area_m2} onChange={change("area_m2")} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label="Acompte (%)" value={form.deposit_pct} onChange={change("deposit_pct")} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Ville *" value={form.city} onChange={change("city")} required />
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
                Suivant : ajouter des photos
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {step === 2 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" gutterBottom>Photos et vidéos (optionnel)</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            JPG, PNG, WebP, GIF, MP4 — 10 fichiers max, 50 MB chacun.
          </Typography>

          <Box
            onDrop={onDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-input").click()}
            sx={{
              border: "2px dashed #0E7C66", borderRadius: 2, p: 4,
              textAlign: "center", cursor: "pointer",
              bgcolor: "rgba(14,124,102,0.04)",
              "&:hover": { bgcolor: "rgba(14,124,102,0.08)" }
            }}
          >
            <Typography>Glissez vos fichiers ici ou cliquez pour sélectionner</Typography>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,video/mp4,video/quicktime,video/webm"
              style={{ display: "none" }}
              onChange={onFilePick}
            />
          </Box>

          {files.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 2, gap: 1 }}>
              {files.map((f, i) => (
                <Chip key={i} label={f.name} onDelete={() => removeFile(i)} />
              ))}
            </Stack>
          )}

          {uploadProgress !== null && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              {uploadProgress === 100 && (
                <Typography color="success.main" sx={{ mt: 1 }}>
                  {uploadedPhotos.length} fichier(s) uploadé(s) — redirection...
                </Typography>
              )}
            </Box>
          )}

          {uploadErr && <Alert severity="error" sx={{ mt: 2 }}>{uploadErr}</Alert>}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" onClick={() => router.push("/properties/" + propertyId)} disabled={busy}>
              Passer cette étape
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
