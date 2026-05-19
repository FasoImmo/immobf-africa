import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, LinearProgress, Chip, Stack,
  FormControlLabel, Switch, Divider, CircularProgress,
  ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties, Photos, Payments } from "../lib/api";

const TX_TYPES = [
  { value: "sale",       label: "Vente" },
  { value: "rent_long",  label: "Location longue durée" },
  { value: "rent_short", label: "Location courte durée / nuitée" },
];

const RENT_PERIODS = [
  { value: "monthly", label: "Par mois" },
  { value: "weekly",  label: "Par semaine" },
  { value: "nightly", label: "Par nuit" },
];

const PROP_TYPES = ["land","house","apartment","office","commercial"];
const LISTING_FEE = 1000; // XOF

// ─── Provider labels ─────────────────────────────────────────────────────────
const PROVIDER_LABELS = {
  fedapay:        "FedaPay (tous opérateurs) ✓",
  orange_money_bf:"Orange Money",
  moov_money_bf:  "Moov Money",
  wave:           "Wave",
  cinetpay:       "CinetPay",
};

export default function SellPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // ─── Étape courante : 1=formulaire 2=paiement 3=photos ───────────────────
  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(null);

  // ─── Étape 1 : formulaire ─────────────────────────────────────────────────
  const [form, setForm] = useState({
    transaction_type: "sale",
    type: "house", title: "", description: "",
    price: "", currency: "XOF", area_m2: "", bedrooms: "", bathrooms: "",
    country_code: "BF", city: "", address: "", deposit_pct: 5,
    is_furnished: false, rent_period: "monthly",
  });
  const [formErr, setFormErr] = useState(null);
  const [formBusy, setFormBusy] = useState(false);

  // ─── Étape 2 : paiement ───────────────────────────────────────────────────
  const [providers, setProviders] = useState([]);
  const [provider, setProvider] = useState("");
  const [phone, setPhone] = useState("");
  const [payErr, setPayErr] = useState(null);
  const [payBusy, setPayBusy] = useState(false);
  const [txId, setTxId] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState(null);
  const [ussdCode, setUssdCode] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  // ─── Étape 3 : photos ─────────────────────────────────────────────────────
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [uploadErr, setUploadErr] = useState(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  // Charger les providers quand on arrive à l'étape 2
  useEffect(function() {
    if (step !== 2) return;
    Payments.providers("BF").then(function(d) {
      setProviders(d.providers || []);
      var fp = (d.providers || []).find(function(p) { return p.name === "fedapay"; });
      setProvider(fp ? "fedapay" : (d.providers[0] || {}).name || "");
    });
  }, [step]);

  // Polling statut transaction
  useEffect(function() {
    if (!polling || !txId) return;
    pollRef.current = setInterval(async function() {
      try {
        var data = await Payments.get(txId);
        if (data.transaction.status === "succeeded") {
          clearInterval(pollRef.current);
          setPolling(false);
          setStep(3);
        } else if (data.transaction.status === "failed") {
          clearInterval(pollRef.current);
          setPolling(false);
          setPayErr("Le paiement a échoué. Veuillez réessayer.");
        }
      } catch (_) {}
    }, 3000);
    return function() { clearInterval(pollRef.current); };
  }, [polling, txId]);

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

  // ─── Étape 1 : soumettre le formulaire ───────────────────────────────────
  async function submitProperty(e) {
    e.preventDefault(); setFormErr(null); setFormBusy(true);
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
      setPropertyId(res.property.id);
      setStep(2);
    } catch (err) {
      setFormErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setFormBusy(false); }
  }

  // ─── Étape 2 : payer les frais de publication ────────────────────────────
  async function payListingFee() {
    setPayErr(null); setPayBusy(true);
    try {
      var res = await Payments.initiate({
        provider: provider,
        amount: LISTING_FEE,
        currency: "XOF",
        property_id: propertyId,
        purpose: "listing_fee",
        customer_phone: phone,
        description: "Frais de publication ImmoBF — 1 000 FCFA",
      });
      setTxId(res.transaction_id);
      if (res.payment_url) setPaymentUrl(res.payment_url);
      if (res.ussd_code) setUssdCode(res.ussd_code);
      setPolling(true);
    } catch (err) {
      setPayErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setPayBusy(false); }
  }

  // ─── Étape 3 : upload photos ─────────────────────────────────────────────
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
    setUploadErr(null); setUploadProgress(10); setUploadBusy(true);
    try {
      var result = await Photos.upload(propertyId, files);
      setUploadedCount(result.photos.length);
      setUploadProgress(100);
      setTimeout(function() { router.push("/properties/" + propertyId); }, 1200);
    } catch (err) {
      setUploadErr(err && err.response && err.response.data && err.response.data.error
        ? err.response.data.error.message : err.message);
    } finally { setUploadBusy(false); }
  }

  // ─── Stepper header ───────────────────────────────────────────────────────
  var steps = ["1. Détails", "2. Paiement (1 000 FCFA)", "3. Photos"];

  return (
    <Layout title="Publier une annonce — ImmoBF">
      <Typography variant="h4" gutterBottom>Publier une annonce</Typography>

      {/* Progress steps */}
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {steps.map(function(label, i) {
          var active = step === i + 1;
          var done = step > i + 1;
          return (
            <Chip
              key={label}
              label={label}
              color={done ? "success" : active ? "primary" : "default"}
              variant={active ? "filled" : "outlined"}
              size="small"
            />
          );
        })}
      </Stack>

      {/* ─── ÉTAPE 1 : Formulaire ─────────────────────────────────────────── */}
      {step === 1 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <form onSubmit={submitProperty}>
            <Grid container spacing={2}>
              {/* ── Sélecteur type de transaction (boutons visibles) ── */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
                  Type de transaction *
                </Typography>
                <ToggleButtonGroup
                  exclusive fullWidth
                  value={form.transaction_type}
                  onChange={function(_, v) { if (v) setForm(function(f) { return Object.assign({}, f, { transaction_type: v }); }); }}
                  sx={{ gap: 1 }}
                >
                  <ToggleButton value="sale" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🏷️ Vente
                  </ToggleButton>
                  <ToggleButton value="rent_long" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🔑 Location
                  </ToggleButton>
                  <ToggleButton value="rent_short" sx={{ flex: 1, py: 1.5, fontWeight: 600, borderRadius: "8px !important" }}>
                    🌙 Courte durée
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
                    <TextField select fullWidth label="Période de location" value={form.rent_period} onChange={change("rent_period")}>
                      {RENT_PERIODS.map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: "flex", alignItems: "center" }}>
                    <FormControlLabel
                      control={<Switch checked={form.is_furnished} onChange={change("is_furnished")} />}
                      label="Meublé / équipé"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}><Divider /></Grid>

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
                <TextField fullWidth type="number" label="Superficie (m²)" value={form.area_m2} onChange={change("area_m2")} />
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

            {formErr && <Alert severity="error" sx={{ mt: 2 }}>{formErr}</Alert>}
            <Box sx={{ mt: 3, textAlign: "right" }}>
              <Button type="submit" variant="contained" disabled={formBusy}>
                Suivant : payer les frais (1 000 FCFA)
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* ─── ÉTAPE 2 : Paiement frais de publication ─────────────────────── */}
      {step === 2 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" gutterBottom>Frais de publication</Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            Chaque annonce publiée sur ImmoBF coûte <strong>1 000 FCFA</strong>. Ce frais unique couvre
            la modération, l'hébergement et la mise en avant de votre annonce.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth label="Moyen de paiement" value={provider}
                onChange={function(e) { setProvider(e.target.value); }}
                disabled={polling}
              >
                {providers.map(function(p) {
                  return (
                    <MenuItem key={p.name} value={p.name}>
                      {PROVIDER_LABELS[p.name] || p.name}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Numéro mobile money (+226…)" value={phone}
                onChange={function(e) { setPhone(e.target.value); }}
                disabled={polling}
              />
            </Grid>
          </Grid>

          {payErr && <Alert severity="error" sx={{ mt: 2 }}>{payErr}</Alert>}

          {ussdCode && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Composez <strong>{ussdCode}</strong> sur votre téléphone pour valider le paiement.
            </Alert>
          )}

          {paymentUrl && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <Button href={paymentUrl} target="_blank" rel="noreferrer" variant="outlined" size="small">
                Ouvrir la page de paiement
              </Button>
            </Alert>
          )}

          {polling && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary">
                En attente de confirmation du paiement…
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" disabled={polling} onClick={function() { setStep(1); }}>
              ← Retour
            </Button>
            <Button
              variant="contained" size="large"
              disabled={payBusy || polling || !phone || !provider}
              onClick={payListingFee}
            >
              {payBusy ? "Initialisation…" : "Payer 1 000 FCFA"}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── ÉTAPE 3 : Photos ────────────────────────────────────────────── */}
      {step === 3 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✓ Paiement confirmé — votre annonce est publiée !
          </Alert>
          <Typography variant="h6" gutterBottom>Ajouter des photos et vidéos (optionnel)</Typography>
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
            <Typography>Glissez vos fichiers ici ou cliquez pour sélectionner</Typography>
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
              <LinearProg