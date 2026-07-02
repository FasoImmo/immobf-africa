import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, Chip, Stack, FormControlLabel, Switch,
  Divider, CircularProgress, ToggleButton, ToggleButtonGroup,
  IconButton, Autocomplete,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { useTranslation } from "react-i18next";
import Layout from "../../../components/Layout";
import { Properties, Photos } from "../../../lib/api";

const AFRICAN_COUNTRIES = [
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "SN", flag: "🇸🇳", name: "Sénégal" },
  { code: "ML", flag: "🇲🇱", name: "Mali" },
  { code: "TG", flag: "🇹🇬", name: "Togo" },
  { code: "BJ", flag: "🇧🇯", name: "Bénin" },
  { code: "NE", flag: "🇳🇪", name: "Niger" },
  { code: "GN", flag: "🇬🇳", name: "Guinée" },
  { code: "GH", flag: "🇬🇭", name: "Ghana" },
  { code: "NG", flag: "🇳🇬", name: "Nigeria" },
  { code: "CM", flag: "🇨🇲", name: "Cameroun" },
  { code: "KE", flag: "🇰🇪", name: "Kenya" },
  { code: "MA", flag: "🇲🇦", name: "Maroc" },
  { code: "DZ", flag: "🇩🇿", name: "Algérie" },
  { code: "TN", flag: "🇹🇳", name: "Tunisie" },
  { code: "EG", flag: "🇪🇬", name: "Égypte" },
  { code: "ZA", flag: "🇿🇦", name: "Afrique du Sud" },
  { code: "CD", flag: "🇨🇩", name: "RD Congo" },
  { code: "RW", flag: "🇷🇼", name: "Rwanda" },
  { code: "ET", flag: "🇪🇹", name: "Éthiopie" },
];

const CITIES_BY_COUNTRY = {
  BF: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Banfora", "Ouahigouya", "Kaya", "Tenkodogo"],
  CI: ["Abidjan", "Bouaké", "Yamoussoukro", "San-Pédro", "Korhogo"],
  SN: ["Dakar", "Thiès", "Saint-Louis", "Touba", "Ziguinchor"],
  ML: ["Bamako", "Sikasso", "Mopti", "Koutiala", "Kayes"],
  TG: ["Lomé", "Sokodé", "Kara"],
  BJ: ["Cotonou", "Porto-Novo", "Parakou"],
  NE: ["Niamey", "Zinder", "Maradi"],
  GH: ["Accra", "Kumasi", "Tamale"],
  NG: ["Lagos", "Abuja", "Kano", "Ibadan"],
};

const PROP_TYPES = ["land", "house", "apartment", "office", "commercial"];

const RENT_PERIODS = (t) => [
  { value: "monthly", label: t("sell.period_monthly") },
  { value: "weekly",  label: t("sell.period_weekly") },
  { value: "nightly", label: t("sell.period_nightly") },
];

export default function EditPropertyPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [saveOk, setSaveOk] = useState(false);

  const [currentPhotos, setCurrentPhotos] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState(null);
  const [deletingPhoto, setDeletingPhoto] = useState(null);

  const [form, setForm] = useState({
    transaction_type: "sale", type: "house",
    title: "", description: "", price: "", currency: "XOF",
    area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", neighborhood: "",
    is_furnished: false, rent_period: "monthly",
  });

  // Charger l'annonce existante
  useEffect(function() {
    if (!id) return;
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.replace("/login"); return; }

    Properties.get(id).then(function(d) {
      const p = d.property;
      setForm({
        transaction_type: p.transaction_type || "sale",
        type: p.type || "house",
        title: p.title || "",
        description: p.description || "",
        price: p.price || "",
        currency: p.currency || "XOF",
        area_m2: p.area_m2 || "",
        bedrooms: p.bedrooms || "",
        bathrooms: p.bathrooms || "",
        country_code: p.country_code || "BF",
        city: p.city || "",
        address: p.address || "",
        neighborhood: p.neighborhood || "",
        is_furnished: p.is_furnished || false,
        rent_period: p.rent_period || "monthly",
      });
      setCurrentPhotos(p.photos || []);
    }).catch(function() {
      router.replace("/account");
    }).finally(function() {
      setLoading(false);
    });
  }, [id]); // eslint-disable-line

  function change(k) {
    return function(e) {
      var val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setForm(function(f) { return Object.assign({}, f, { [k]: val }); });
    };
  }

  var isRent = form.transaction_type !== "sale";

  async function handleSave(e) {
    e.preventDefault();
    setSaveErr(null); setSaveOk(false); setSaving(true);
    try {
      var payload = Object.assign({}, form, {
        price: Number(form.price),
        area_m2: form.area_m2 ? Number(form.area_m2) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        is_furnished: Boolean(form.is_furnished),
        rent_period: isRent ? form.rent_period : null,
      });
      await Properties.update(id, payload);

      // Uploader de nouvelles photos si sélectionnées
      if (newFiles.length > 0) {
        setUploading(true);
        const result = await Photos.upload(id, newFiles);
        setCurrentPhotos(function(prev) { return prev.concat(result.photos || []); });
        setNewFiles([]);
        setUploading(false);
      }

      setSaveOk(true);
      window.scrollTo(0, 0);
    } catch (err) {
      setSaveErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setSaving(false); }
  }

  async function handleDeletePhoto(photo) {
    if (!confirm(t("edit.confirm_delete_photo"))) return;
    setDeletingPhoto(photo.id);
    try {
      await Photos.delete(id, photo.id);
      setCurrentPhotos(function(prev) { return prev.filter(function(p) { return p.id !== photo.id; }); });
    } catch (_) {
      alert(t("edit.delete_photo_error"));
    } finally { setDeletingPhoto(null); }
  }

  var onFilePick = useCallback(function(e) {
    var picked = Array.from(e.target.files || []);
    setNewFiles(function(prev) { return prev.concat(picked).slice(0, 10); });
  }, []);

  function removeNewFile(i) {
    setNewFiles(function(f) { return f.filter(function(_, idx) { return idx !== i; }); });
  }

  if (loading) {
    return (
      <Layout title={t("edit.page_title")}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title={`${t("edit.page_title")} — ImmoBF Africa`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>{t("edit.page_title")}</Typography>
        <Chip
          label={t("edit.duration_locked")}
          color="info" size="small" variant="outlined"
        />
      </Box>

      {saveOk && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveOk(false)}>
          {t("edit.save_success")}
        </Alert>
      )}
      {saveErr && <Alert severity="error" sx={{ mb: 2 }}>{saveErr}</Alert>}

      <Paper sx={{ p: 3 }} elevation={1}>
        <form onSubmit={handleSave}>
          <Grid container spacing={2}>
            {/* Type transaction */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                {t("sell.transaction_type")} *
              </Typography>
              <ToggleButtonGroup
                exclusive fullWidth
                value={form.transaction_type}
                onChange={function(_, v) { if (v) setForm(function(f) { return Object.assign({}, f, { transaction_type: v }); }); }}
                sx={{ gap: 1 }}
              >
                <ToggleButton value="sale" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                  🏷️ {t("nav.publish_sale")}
                </ToggleButton>
                <ToggleButton value="rent_long" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                  🔑 {t("nav.publish_rent_long")}
                </ToggleButton>
                <ToggleButton value="rent_short" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                  🌙 {t("nav.publish_rent_short")}
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label={t("search.type")} value={form.type} onChange={change("type")}>
                {PROP_TYPES.map(function(v) { return <MenuItem key={v} value={v}>{t("types." + v)}</MenuItem>; })}
              </TextField>
            </Grid>

            {isRent && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField select fullWidth label={t("sell.rent_period")} value={form.rent_period} onChange={change("rent_period")}>
                    {RENT_PERIODS(t).map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
                  <FormControlLabel
                    control={<Switch checked={form.is_furnished} onChange={change("is_furnished")} />}
                    label={t("sell.furnished")}
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}><Divider /></Grid>

            <Grid item xs={12} sm={8}>
              <TextField fullWidth label={`${t("sell.title_field")} *`} value={form.title} onChange={change("title")} required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField select fullWidth label={t("sell.country")} value={form.country_code} onChange={change("country_code")}>
                {AFRICAN_COUNTRIES.map((c) => (
                  <MenuItem key={c.code} value={c.code}>{c.flag} {c.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={3} label={t("sell.description")} value={form.description} onChange={change("description")} />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label={t("sell.price_sale")} value={form.price} onChange={change("price")} required
                helperText={form.price ? `${Number(form.price).toLocaleString("fr-FR")} FCFA` : " "} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth type="number" label={t("sell.area")} value={form.area_m2} onChange={change("area_m2")}
                helperText={form.area_m2 ? `${Number(form.area_m2).toLocaleString("fr-FR")} m²` : " "} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Autocomplete
                freeSolo
                options={CITIES_BY_COUNTRY[form.country_code] || []}
                value={form.city}
                onInputChange={function(_, v) { setForm(function(f) { return Object.assign({}, f, { city: v }); }); }}
                renderInput={function(params) {
                  return <TextField {...params} fullWidth label={`${t("sell.city")} *`} required helperText={t("sell.city_helper")} />;
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label={t("sell.neighborhood")} value={form.neighborhood} onChange={change("neighborhood")} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label={t("sell.address")} value={form.address} onChange={change("address")} />
            </Grid>

            {form.type !== "land" && (
              <>
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth type="number" label={t("sell.bedrooms")} value={form.bedrooms} onChange={change("bedrooms")} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth type="number" label={t("sell.bathrooms")} value={form.bathrooms} onChange={change("bathrooms")} />
                </Grid>
              </>
            )}
          </Grid>

          {/* ─── Photos actuelles ─────────────────────────────────────────── */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="h6" gutterBottom>{t("edit.current_photos")}</Typography>

          {currentPhotos.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t("edit.no_photos")}
            </Typography>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
            {currentPhotos.map(function(photo) {
              return (
                <Box key={photo.id} sx={{ position: "relative", width: 120, height: 90 }}>
                  {/* eslint-disable-next-line */}
                  <img
                    src={photo.url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }}
                  />
                  <IconButton
                    size="small"
                    disabled={deletingPhoto === photo.id}
                    onClick={function() { handleDeletePhoto(photo); }}
                    sx={{
                      position: "absolute", top: 2, right: 2,
                      bgcolor: "rgba(0,0,0,0.55)", color: "white",
                      "&:hover": { bgcolor: "rgba(200,0,0,0.8)" },
                    }}
                  >
                    {deletingPhoto === photo.id
                      ? <CircularProgress size={14} color="inherit" />
                      : <DeleteIcon fontSize="small" />
                    }
                  </IconButton>
                </Box>
              );
            })}
          </Stack>

          {/* ─── Ajouter de nouvelles photos ──────────────────────────────── */}
          <Typography variant="subtitle2" gutterBottom>{t("edit.add_photos")}</Typography>
          <Box
            onClick={function() { document.getElementById("edit-file-input").click(); }}
            sx={{
              border: "2px dashed #0E7C66", borderRadius: 2, p: 3,
              textAlign: "center", cursor: "pointer", mb: 1,
              bgcolor: "rgba(14,124,102,0.04)",
              "&:hover": { bgcolor: "rgba(14,124,102,0.08)" },
            }}
          >
            <Typography variant="body2" color="text.secondary">{t("sell.photos_drop")}</Typography>
            <input id="edit-file-input" type="file" multiple accept="image/*"
              style={{ display: "none" }} onChange={onFilePick} />
          </Box>

          {newFiles.length > 0 && (
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2, gap: 1 }}>
              {newFiles.map(function(f, i) {
                return <Chip key={i} label={f.name} onDelete={function() { removeNewFile(i); }} />;
              })}
            </Stack>
          )}

          {uploadErr && <Alert severity="error" sx={{ mb: 2 }}>{uploadErr}</Alert>}

          {/* ─── Actions ──────────────────────────────────────────────────── */}
          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" onClick={function() { router.push("/account"); }} disabled={saving || uploading}>
              {t("sell.back_btn")}
            </Button>
            <Button
              type="submit" variant="contained" size="large"
              disabled={saving || uploading}
            >
              {(saving || uploading) ? <CircularProgress size={20} color="inherit" /> : t("edit.save_btn")}
            </Button>
          </Box>
        </form>
      </Paper>
    </Layout>
  );
}
