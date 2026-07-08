import { useEffect, useState } from "react";
import {
  Box, Grid, Paper, Typography, TextField, Button, Switch, FormControlLabel,
  Alert, Divider, CircularProgress, Chip,
} from "@mui/material";
import SavingsIcon        from "@mui/icons-material/Savings";
import CelebrationIcon    from "@mui/icons-material/Celebration";
import EmailIcon          from "@mui/icons-material/Email";
import AdminLayout        from "../../components/AdminLayout";
import { Admin }          from "../../lib/api";

function SectionCard({ icon, title, color = "#0E7C66", children }) {
  return (
    <Paper sx={{ borderRadius: 2.5, overflow: "hidden", mb: 3 }}>
      <Box sx={{ px: 3, py: 2, bgcolor: color + "0F", borderBottom: "1px solid " + color + "22", display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ color, display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#0F172A" }}>{title}</Typography>
      </Box>
      <Box sx={{ p: 3 }}>{children}</Box>
    </Paper>
  );
}

export default function AdminSettings() {
  // ── Tarifs ────────────────────────────────────────────────────────────────
  const [pricing,      setPricing]      = useState(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg,   setPricingMsg]   = useState(null);

  // ── Promo ─────────────────────────────────────────────────────────────────
  const [promo,      setPromo]      = useState(null);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoMsg,   setPromoMsg]   = useState(null);

  // ── Email test ────────────────────────────────────────────────────────────
  const [emailTo,    setEmailTo]    = useState("");
  const [emailBusy,  setEmailBusy]  = useState(false);
  const [emailResult, setEmailResult] = useState(null);

  useEffect(() => {
    Admin.getPricing().then(setPricing).catch(() => {});
    Admin.getPromo().then(setPromo).catch(() => {});
  }, []);

  // ── Sauvegarde tarifs ─────────────────────────────────────────────────────
  async function savePricing() {
    setPricingSaving(true); setPricingMsg(null);
    try {
      const r = await Admin.setPricing({
        listing_1m:     pricing.listing_1m,
        listing_3m:     pricing.listing_3m,
        listing_6m:     pricing.listing_6m,
        listing_12m:    pricing.listing_12m,
        commission_pct: pricing.commission_pct,
      });
      setPricing(r.pricing);
      setPricingMsg({ ok: true, text: "Tarifs enregistrés ✅" });
    } catch {
      setPricingMsg({ ok: false, text: "Erreur lors de la sauvegarde." });
    } finally { setPricingSaving(false); }
  }

  // ── Sauvegarde promo ──────────────────────────────────────────────────────
  async function savePromo() {
    setPromoSaving(true); setPromoMsg(null);
    try {
      const r = await Admin.setPromo({
        active:        promo.configured,
        start:         promo.start   || null,
        end:           promo.end     || null,
        message_fr:    promo.message_fr || null,
        message_en:    promo.message_en || null,
        duration_days: promo.duration_days ? Number(promo.duration_days) : null,
      });
      setPromo(r.promo);
      setPromoMsg({ ok: true, text: "Promo enregistrée ✅" });
    } catch {
      setPromoMsg({ ok: false, text: "Erreur lors de la mise à jour." });
    } finally { setPromoSaving(false); }
  }

  // ── Test email ────────────────────────────────────────────────────────────
  async function sendTestEmail() {
    setEmailBusy(true); setEmailResult(null);
    try {
      const r = await Admin.testEmail(emailTo);
      setEmailResult({
        ok:  r.ok,
        msg: r.ok
          ? `Email envoyé (id: ${r.resend?.data?.id || "—"})`
          : `Refusé : ${JSON.stringify(r.resend?.error || r.error)}`,
      });
    } catch (e) {
      setEmailResult({ ok: false, msg: e?.response?.data?.error?.message || "Erreur réseau" });
    } finally { setEmailBusy(false); }
  }

  return (
    <AdminLayout title="Paramètres — Admin ImmoBF">
      {/* ── 1. Tarifs annonces ──────────────────────────────────────────── */}
      <SectionCard icon={<SavingsIcon />} title="Tarifs annonces & commission">
        {pricing === null ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Ces tarifs s&apos;appliquent immédiatement aux nouvelles publications.
            </Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {[
                { key: "listing_1m",  label: "1 mois (FCFA)" },
                { key: "listing_3m",  label: "3 mois (FCFA)" },
                { key: "listing_6m",  label: "6 mois (FCFA)" },
                { key: "listing_12m", label: "12 mois (FCFA)" },
                { key: "commission_pct", label: "Commission (%)", step: 0.5, max: 100 },
              ].map(({ key, label, step = 1, max }) => (
                <Grid item xs={6} sm={4} md={2} key={key}>
                  <TextField
                    size="small" label={label} type="number"
                    value={pricing[key] ?? ""}
                    onChange={(e) => setPricing((p) => ({ ...p, [key]: Number(e.target.value) }))}
                    inputProps={{ min: 0, step, max }}
                    fullWidth
                  />
                </Grid>
              ))}
            </Grid>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained" size="small" disabled={pricingSaving}
                onClick={savePricing}
                sx={{ bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0a6354" }, borderRadius: 1.5 }}
              >
                {pricingSaving ? <CircularProgress size={16} color="inherit" /> : "Enregistrer les tarifs"}
              </Button>
              {pricingMsg && (
                <Typography variant="caption" color={pricingMsg.ok ? "success.main" : "error"} fontWeight={600}>
                  {pricingMsg.text}
                </Typography>
              )}
            </Box>
          </>
        )}
      </SectionCard>

      {/* ── 2. Promo publication gratuite ───────────────────────────────── */}
      <SectionCard icon={<CelebrationIcon />} title="Publication gratuite — offre temporaire" color="#7c3aed">
        {promo === null ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
        ) : (
          <>
            <FormControlLabel
              sx={{ mb: 2 }}
              control={
                <Switch
                  checked={promo.configured || false}
                  onChange={async (e) => {
                    setPromoSaving(true); setPromoMsg(null);
                    try {
                      const r = await Admin.setPromo({ active: e.target.checked });
                      setPromo(r.promo);
                      setPromoMsg({ ok: true, text: e.target.checked ? "Promo activée ✅" : "Promo désactivée" });
                    } catch { setPromoMsg({ ok: false, text: "Erreur." }); }
                    finally { setPromoSaving(false); }
                  }}
                  color="secondary"
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography fontWeight={600}>{promo.configured ? "Promo ACTIVE" : "Promo inactive"}</Typography>
                  <Chip
                    label={promo.configured ? "ON" : "OFF"}
                    size="small"
                    sx={{
                      bgcolor: promo.configured ? "#f0fdf4" : "#fef2f2",
                      color: promo.configured ? "#16a34a" : "#dc2626",
                      fontWeight: 700, fontSize: 11,
                    }}
                  />
                </Box>
              }
            />

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" type="date" label="Début" fullWidth
                  value={promo.start || ""}
                  onChange={(e) => setPromo((p) => ({ ...p, start: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" type="date" label="Fin" fullWidth
                  value={promo.end || ""}
                  onChange={(e) => setPromo((p) => ({ ...p, end: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField size="small" type="number" label="Durée annonce (jours)" fullWidth
                  value={promo.duration_days ?? ""}
                  onChange={(e) => setPromo((p) => ({ ...p, duration_days: e.target.value ? Number(e.target.value) : null }))}
                  inputProps={{ min: 1, max: 365 }}
                  helperText="Laisser vide = pas d'expiration"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="Message FR"
                  value={promo.message_fr || ""}
                  onChange={(e) => setPromo((p) => ({ ...p, message_fr: e.target.value }))}
                  placeholder="🎉 Publication gratuite jusqu'au 31 juillet !"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="Message EN"
                  value={promo.message_en || ""}
                  onChange={(e) => setPromo((p) => ({ ...p, message_en: e.target.value }))}
                  placeholder="🎉 Free listing until July 31!"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Button
                variant="contained" size="small" disabled={promoSaving}
                onClick={savePromo}
                sx={{ bgcolor: "#7c3aed", "&:hover": { bgcolor: "#6d28d9" }, borderRadius: 1.5 }}
              >
                {promoSaving ? <CircularProgress size={16} color="inherit" /> : "Enregistrer la promo"}
              </Button>
              {promoMsg && (
                <Typography variant="caption" color={promoMsg.ok ? "success.main" : "error"} fontWeight={600}>
                  {promoMsg.text}
                </Typography>
              )}
            </Box>
          </>
        )}
      </SectionCard>

      {/* ── 3. Diagnostic email ──────────────────────────────────────────── */}
      <SectionCard icon={<EmailIcon />} title="Diagnostic email — test d'envoi Resend" color="#0369a1">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Envoie un email de test depuis <code>noreply@immoafrica.online</code> via Resend.
          Utile pour vérifier que la livraison fonctionne.
        </Typography>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small" type="email" label="Adresse de destination"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="votre@email.com"
            sx={{ minWidth: 280 }}
          />
          <Button
            variant="contained" size="small"
            disabled={emailBusy || !emailTo}
            onClick={sendTestEmail}
            sx={{ bgcolor: "#0369a1", "&:hover": { bgcolor: "#0c4a6e" }, borderRadius: 1.5 }}
          >
            {emailBusy ? <CircularProgress size={16} color="inherit" /> : "Envoyer le test"}
          </Button>
        </Box>
        {emailResult && (
          <Alert severity={emailResult.ok ? "success" : "error"} sx={{ mt: 2, borderRadius: 1.5 }}>
            {emailResult.msg}
          </Alert>
        )}
      </SectionCard>
    </AdminLayout>
  );
}
