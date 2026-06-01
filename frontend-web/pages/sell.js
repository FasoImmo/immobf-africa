import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, TextField, Button, Typography, MenuItem,
  Alert, Grid, LinearProgress, Chip, Stack,
  FormControlLabel, Switch, Divider, CircularProgress,
  ToggleButton, ToggleButtonGroup, Select, FormControl,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Properties, Photos, Payments } from "../lib/api";

// Pays africains — utilisé pour le sélecteur pays et l'indicatif mobile money
const AFRICAN_COUNTRIES = [
  { code: "BF", dial: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "ML", dial: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "NE", dial: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "TG", dial: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "BJ", dial: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "GN", dial: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "GH", dial: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "TZ", dial: "+255", flag: "🇹🇿", name: "Tanzanie" },
  { code: "RW", dial: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "DZ", dial: "+213", flag: "🇩🇿", name: "Algérie" },
  { code: "TN", dial: "+216", flag: "🇹🇳", name: "Tunisie" },
  { code: "EG", dial: "+20",  flag: "🇪🇬", name: "Égypte" },
  { code: "MG", dial: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "MU", dial: "+230", flag: "🇲🇺", name: "Maurice" },
];

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
const EUR_RATE = 655.957;
const USD_RATE = 600;

// Plans d'abonnement avec tarifs dégressifs
const LISTING_PLANS = [
  { months: 1,  price: 2000,  label: "1 mois",  saving: null },
  { months: 3,  price: 5500,  label: "3 mois",  saving: "−8%" },
  { months: 6,  price: 10000, label: "6 mois",  saving: "−17%" },
  { months: 12, price: 18000, label: "12 mois", saving: "−25%" },
];

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
  const [dialCode, setDialCode] = useState("+226");
  const [localPhone, setLocalPhone] = useState("");
  const phone = dialCode + localPhone.replace(/\D/g, "");
  const [selectedPlan, setSelectedPlan] = useState(LISTING_PLANS[0]);
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

  // ─── Garde : redirection si non connecté ─────────────────────────────────
  useEffect(function() {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("immobf_token");
      if (!token) {
        router.replace("/login?redirect=/sell");
      }
    }
  }, []); // eslint-disable-line

  // ─── Pré-sélection du type de transaction via ?tx= ────────────────────────
  useEffect(function() {
    if (!router.isReady) return;
    const tx = router.query.tx;
    if (tx && ["sale", "rent_long", "rent_short"].includes(tx)) {
      setForm(function(f) { return Object.assign({}, f, { transaction_type: tx }); });
    }
  }, [router.isReady, router.query.tx]); // eslint-disable-line

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
  var priceLabel = form.transaction_type === "sale" ? t("sell.price_sale")
    : form.transaction_type === "rent_short" ? t("sell.price_rent_short")
    : t("sell.price_rent_long");

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
        amount: selectedPlan.price,
        currency: "XOF",
        property_id: propertyId,
        purpose: "listing_fee",
        customer_phone: phone,
        description: `Abonnement ImmoBF Africa — ${selectedPlan.price.toLocaleString("fr-FR")} FCFA / ${selectedPlan.label}`,
      });
      setTxId(res.transaction_id);
      // Stub mode : succès immédiat → passer directement à l'étape photos
      if (res.status === "succeeded") {
        setStep(3);
        return;
      }
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
  var steps = [
    `1. ${t("sell.step_details")}`,
    `2. ${t("sell.step_payment")}`,
    `3. ${t("sell.step_photos")}`,
  ];

  return (
    <Layout title={`${t("sell.title")} — ImmoBF`}>
      <Typography variant="h4" gutterBottom>{t("sell.title")}</Typography>

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
                      {RENT_PERIODS.map(function(o) { return <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>; })}
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
                    <MenuItem key={c.code} value={c.code}>
                      {c.flag} {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={3} label={t("sell.description")} value={form.description} onChange={change("description")} />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label={priceLabel} value={form.price} onChange={change("price")} required
                  helperText={form.price ? `${Number(form.price).toLocaleString("fr-FR")} FCFA` : " "} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth type="number" label={t("sell.area")} value={form.area_m2} onChange={change("area_m2")}
                  helperText={form.area_m2 ? `${Number(form.area_m2).toLocaleString("fr-FR")} m²` : " "} />
              </Grid>
              {form.transaction_type === "sale" && (
                <Grid item xs={12} sm={4}>
                  <TextField fullWidth type="number" label={t("sell.deposit_pct")} value={form.deposit_pct} onChange={change("deposit_pct")}
                    helperText={form.price && form.deposit_pct
                      ? `= ${Math.round(Number(form.price) * Number(form.deposit_pct) / 100).toLocaleString("fr-FR")} FCFA`
                      : " "} />
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField fullWidth label={`${t("sell.city")} *`} value={form.city} onChange={change("city")} required />
              </Grid>
              <Grid item xs={12} sm={6}>
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

            {formErr && <Alert severity="error" sx={{ mt: 2 }}>{formErr}</Alert>}
            <Box sx={{ mt: 3, textAlign: "right" }}>
              <Button type="submit" variant="contained" disabled={formBusy}>
                {t("sell.next_btn")}
              </Button>
            </Box>
          </form>
        </Paper>
      )}

      {/* ─── ÉTAPE 2 : Paiement frais de publication ─────────────────────── */}
      {step === 2 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Typography variant="h6" gutterBottom>{t("sell.step_payment")}</Typography>
          {/* Sélecteur de durée */}
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {t("sell.choose_duration")}
          </Typography>
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {LISTING_PLANS.map((plan) => {
              const selected = selectedPlan.months === plan.months;
              const eur = (plan.price / EUR_RATE).toFixed(2);
              return (
                <Grid item xs={6} sm={3} key={plan.months}>
                  <Paper
                    elevation={selected ? 4 : 1}
                    onClick={() => setSelectedPlan(plan)}
                    sx={{
                      p: 1.5, textAlign: "center", cursor: "pointer",
                      border: selected ? "2px solid #0E7C66" : "2px solid transparent",
                      borderRadius: 2, position: "relative",
                      "&:hover": { borderColor: "#0E7C66" },
                    }}
                  >
                    {plan.saving && (
                      <Chip label={plan.saving} color="success" size="small"
                        sx={{ position: "absolute", top: -10, right: -10, fontSize: 10 }} />
                    )}
                    <Typography variant="h6" color="primary" fontWeight={700}>
                      {plan.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {plan.price.toLocaleString("fr-FR")} FCFA
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ≈ {eur} €
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          <Alert severity="info" sx={{ mb: 2 }}>
            {t("sell.plan_selected")} : <strong>{selectedPlan.label}</strong> —{" "}
            <strong>{selectedPlan.price.toLocaleString("fr-FR")} FCFA</strong>{" "}
            <Typography component="span" variant="body2" color="text.secondary">
              (≈ {(selectedPlan.price / EUR_RATE).toFixed(2)} € · ≈ ${(selectedPlan.price / USD_RATE).toFixed(2)})
            </Typography>
            . {t("sell.plan_visible")} <strong>{selectedPlan.months * 30} {t("sell.days")}</strong>.
          </Alert>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                select fullWidth label={t("sell.payment_method")} value={provider}
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
              <Box sx={{ display: "flex", gap: 1 }}>
                <FormControl sx={{ minWidth: 120 }}>
                  <Select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    size="small" sx={{ height: 56 }}
                    disabled={polling}
                  >
                    {AFRICAN_COUNTRIES.map((c) => (
                      <MenuItem key={c.code} value={c.dial}>
                        {c.flag} {c.dial}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  fullWidth label={t("sell.mobile_money")}
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value.replace(/\D/g, ""))}
                  disabled={polling}
                  placeholder="XXXXXXXX"
                  inputMode="tel"
                />
              </Box>
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
              {t("sell.back_btn")}
            </Button>
            <Button
              variant="contained" size="large"
              disabled={payBusy || polling || !phone || !provider}
              onClick={payListingFee}
            >
              {payBusy ? "…" : `${t("sell.pay_btn")} ${selectedPlan.price.toLocaleString("fr-FR")} FCFA`}
            </Button>
          </Box>
        </Paper>
      )}

      {/* ─── ÉTAPE 3 : Photos ────────────────────────────────────────────── */}
      {step === 3 && (
        <Paper sx={{ p: 3 }} elevation={1}>
          <Alert severity="success" sx={{ mb: 2 }}>
            {t("sell.payment_confirmed")}
          </Alert>
          <Typography variant="h6" gutterBottom>{t("sell.photos_title")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("sell.photos_hint")}
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
            <Typography>{t("sell.photos_drop")}</Typography>
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
                  {uploadedCount} fichier(s) uploadé(s) — redirection…
                </Typography>
              )}
            </Box>
          )}

          {uploadErr && <Alert severity="error" sx={{ mt: 2 }}>{uploadErr}</Alert>}

          <Box sx={{ mt: 3, display: "flex", justifyContent: "space-between" }}>
            <Button variant="text" onClick={function() { router.push("/properties/" + propertyId); }} disabled={uploadBusy}>
              {t("sell.skip_photos")}
            </Button>
            <Button variant="contained" onClick={uploadFiles} disabled={uploadBusy}>
              {files.length ? t("sell.upload_btn") : t("sell.finish_btn")}
            </Button>
          </Box>
        </Paper>
      )}
    </Layout>
  );
}
