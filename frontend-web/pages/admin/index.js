import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, CircularProgress, Chip, Divider, TextField, Alert,
} from "@mui/material";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";
import { Switch, FormControlLabel } from "@mui/material";
import { formatFCFA } from "../../lib/format";

function KpiCard({ label, value, color }) {
  return (
    <Paper sx={{ p: 2, height: "100%" }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={700} color={color || "text.primary"} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

function accessGuard(router, setAuthorized) {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("immobf_token");
  if (!token) { router.replace("/login?redirect=/admin"); return; }
  let user = null;
  try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
  if (!user || user.role !== "admin") { setAuthorized(false); return; }
  setAuthorized(true);
}

const PURPOSE_LABEL = {
  listing_fee: "Frais publication",
  commission: "Commission",
  deposit: "Acompte",
};

const STATUS_COLOR = {
  succeeded: "success",
  pending: "warning",
  failed: "error",
};

export default function AdminDashboard() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [data, setData] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testEmailBusy, setTestEmailBusy] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState(null);
  const [promo, setPromo] = useState(null);
  const [promoSaving, setPromoSaving] = useState(false);
  const [promoMsg, setPromoMsg] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg, setPricingMsg] = useState(null);

  useEffect(() => { accessGuard(router, setAuthorized); }, []); // eslint-disable-line

  useEffect(() => {
    if (authorized !== true) return;
    Admin.getPromo().then(setPromo).catch(() => {});
    Admin.getPricing().then(setPricing).catch(() => {});
    setLoading(true);
    Promise.all([Admin.revenues(), Admin.properties({ limit: 200 })])
      .then(([rev, props]) => {
        setData(rev);
        setProperties(props.properties || []);
      })
      .finally(() => setLoading(false));
  }, [authorized]);

  if (authorized === null) {
    return (
      <Layout title="Admin - ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </Layout>
    );
  }
  if (authorized === false) {
    return (
      <Layout title="Admin - ImmoBF">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5">Acces refuse</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Reserve aux administrateurs.</Typography>
        </Paper>
      </Layout>
    );
  }

  const stats = data?.stats || {};
  const annonceurs = data?.annonceurs || [];
  const transactions = data?.transactions || [];

  const byCountry = properties.reduce((acc, p) => {
    const c = p.country_code || "ND";
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  const top5 = [...annonceurs].slice(0, 5);

  function exportCsv() {
    const rows = [["id","nom","email","telephone","nb_annonces","nb_transactions","total_paye_xof","pays_principal","dernier_paiement"]]
      .concat(annonceurs.map((a) => [
        a.id, a.full_name, a.email || "", a.phone, a.nb_annonces,
        a.nb_transactions, a.total_paid, a.main_country || "",
        a.last_payment_at ? new Date(a.last_payment_at).toLocaleDateString("fr-FR") : "",
      ]));
    const csv = rows.map((r) => r.map((v) => String(v ?? "").replace(/"/g, '""')).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "annonceurs-immobf.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Admin - ImmoBF">
      <Typography variant="h4" fontWeight={700} gutterBottom>Tableau de bord</Typography>

      {loading && (
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Chargement...</Typography>
        </Box>
      )}

      {/* ─── Layout 2 colonnes : panels à gauche, navigation à droite ───── */}
      <Grid container spacing={3} alignItems="flex-start" sx={{ mb: 3 }}>
        {/* Colonne gauche — KPIs + réglages */}
        <Grid item xs={12} md={8}>

      <Typography variant="h6" sx={{ mb: 1, mt: 1 }}>Revenus ImmoBF</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="CA Total" value={formatFCFA(stats.total_revenue || 0)} color="#1B6B3A" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Frais publication" value={formatFCFA(stats.revenue_listing || 0)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Commissions" value={formatFCFA(stats.revenue_commission || 0)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Annonceurs actifs" value={stats.nb_annonceurs_actifs || 0} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <KpiCard label="Tx reussies" value={stats.nb_succeeded || 0} color="green" />
        </Grid>
        <Grid item xs={4}>
          <KpiCard label="En attente" value={stats.nb_pending || 0} color="orange" />
        </Grid>
        <Grid item xs={4}>
          <KpiCard label="Echouees" value={stats.nb_failed || 0} color="red" />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* ─── Diagnostic email ───────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f0f4f8", borderRadius: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>🔧 Diagnostic Resend — test d&apos;envoi email</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small" type="email" label="Adresse de destination"
            value={testEmailTo} onChange={(e) => setTestEmailTo(e.target.value)}
            sx={{ bgcolor: "white", minWidth: 240 }}
            placeholder="votre@email.com"
          />
          <Button
            size="small" variant="outlined"
            disabled={testEmailBusy || !testEmailTo}
            onClick={async () => {
              setTestEmailBusy(true); setTestEmailResult(null);
              try {
                const r = await Admin.testEmail(testEmailTo);
                setTestEmailResult({ ok: r.ok, msg: r.ok ? `Envoyé (id: ${r.resend?.data?.id})` : `Refusé : ${JSON.stringify(r.resend?.error || r.error)}`, from: r.from });
              } catch (e) {
                setTestEmailResult({ ok: false, msg: e?.response?.data?.error?.message || "Erreur réseau" });
              } finally { setTestEmailBusy(false); }
            }}
          >
            {testEmailBusy ? <CircularProgress size={16} /> : "Envoyer le test"}
          </Button>
        </Box>
        {testEmailResult && (
          <Alert severity={testEmailResult.ok ? "success" : "error"} sx={{ mt: 1 }}>
            {testEmailResult.msg}
            {testEmailResult.from && <Typography component="span" variant="caption" sx={{ ml: 1, opacity: 0.7 }}>FROM: {testEmailResult.from}</Typography>}
          </Alert>
        )}
      </Paper>

      {/* ─── Tarifs annonces + commission ──────────────────────────────────── */}
      {pricing !== null && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            💰 Tarifs annonces &amp; commission
          </Typography>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            {[
              { key: "listing_1m",  label: "1 mois (FCFA)" },
              { key: "listing_3m",  label: "3 mois (FCFA)" },
              { key: "listing_6m",  label: "6 mois (FCFA)" },
              { key: "listing_12m", label: "12 mois (FCFA)" },
            ].map(({ key, label }) => (
              <Grid item xs={6} sm={3} key={key}>
                <TextField
                  size="small" label={label} type="number"
                  value={pricing[key] ?? ""}
                  onChange={(e) => setPricing((p) => ({ ...p, [key]: Number(e.target.value) }))}
                  inputProps={{ min: 0 }}
                  fullWidth
                />
              </Grid>
            ))}
            <Grid item xs={6} sm={3}>
              <TextField
                size="small" label="Commission %" type="number"
                value={pricing.commission_pct ?? ""}
                onChange={(e) => setPricing((p) => ({ ...p, commission_pct: Number(e.target.value) }))}
                inputProps={{ min: 0, max: 100, step: 0.5 }}
                fullWidth
              />
            </Grid>
          </Grid>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              size="small" variant="contained" color="primary" disabled={pricingSaving}
              onClick={async () => {
                setPricingSaving(true); setPricingMsg(null);
                try {
                  const r = await Admin.setPricing({
                    listing_1m:  pricing.listing_1m,
                    listing_3m:  pricing.listing_3m,
                    listing_6m:  pricing.listing_6m,
                    listing_12m: pricing.listing_12m,
                    commission_pct: pricing.commission_pct,
                  });
                  setPricing(r.pricing);
                  setPricingMsg({ ok: true, text: "Tarifs enregistrés ✅" });
                } catch { setPricingMsg({ ok: false, text: "Erreur lors de la sauvegarde." }); }
                finally { setPricingSaving(false); }
              }}
            >
              {pricingSaving ? <CircularProgress size={16} color="inherit" /> : "Enregistrer"}
            </Button>
            {pricingMsg && <Typography variant="caption" color={pricingMsg.ok ? "success.main" : "error"}>{pricingMsg.text}</Typography>}
          </Box>
        </Paper>
      )}

      {/* ─── Promo publication gratuite ─────────────────────────────────────── */}
      {promo !== null && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f0fdf4", borderRadius: 2, border: "1px solid #86efac" }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5 }}>🎉 Publication gratuite — offre temporaire</Typography>
          <FormControlLabel
            control={
              <Switch
                checked={promo.configured || false}
                onChange={async (e) => {
                  setPromoSaving(true); setPromoMsg(null);
                  try {
                    const r = await Admin.setPromo({ active: e.target.checked });
                    setPromo(r.promo);
                    setPromoMsg({ ok: true, text: e.target.checked ? "Promo activée ✅" : "Promo désactivée" });
                  } catch { setPromoMsg({ ok: false, text: "Erreur lors de la mise à jour." }); }
                  finally { setPromoSaving(false); }
                }}
                color="success"
              />
            }
            label={promo.configured ? "Promo activée" : "Promo désactivée"}
          />
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
            <TextField size="small" type="date" label="Début" value={promo.start || ""}
              onChange={(e) => setPromo((p) => ({ ...p, start: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
            <TextField size="small" type="date" label="Fin" value={promo.end || ""}
              onChange={(e) => setPromo((p) => ({ ...p, end: e.target.value }))}
              InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }} />
          </Box>
          <TextField size="small" fullWidth label="Message FR" value={promo.message_fr || ""}
            onChange={(e) => setPromo((p) => ({ ...p, message_fr: e.target.value }))}
            sx={{ mt: 1 }} placeholder="🎉 Publication gratuite jusqu'au 31 juillet ! Publiez sans frais." />
          <TextField size="small" fullWidth label="Message EN" value={promo.message_en || ""}
            onChange={(e) => setPromo((p) => ({ ...p, message_en: e.target.value }))}
            sx={{ mt: 1 }} placeholder="🎉 Free listing until July 31! Publish at no cost." />
          <Box sx={{ mt: 1.5, display: "flex", gap: 1, alignItems: "center" }}>
            <Button size="small" variant="contained" color="success" disabled={promoSaving}
              onClick={async () => {
                setPromoSaving(true); setPromoMsg(null);
                try {
                  const r = await Admin.setPromo({
                    active: promo.configured,
                    start: promo.start || null,
                    end: promo.end || null,
                    message_fr: promo.message_fr || null,
                    message_en: promo.message_en || null,
                  });
                  setPromo(r.promo);
                  setPromoMsg({ ok: true, text: "Paramètres sauvegardés ✅" });
                } catch { setPromoMsg({ ok: false, text: "Erreur lors de la sauvegarde." }); }
                finally { setPromoSaving(false); }
              }}>
              {promoSaving ? <CircularProgress size={16} color="inherit" /> : "Enregistrer"}
            </Button>
            {promoMsg && <Typography variant="caption" color={promoMsg.ok ? "success.main" : "error"}>{promoMsg.text}</Typography>}
          </Box>
        </Paper>
      )}

        </Grid>{/* fin colonne gauche */}

        {/* Colonne droite — navigation */}
        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 2, borderRadius: 2, position: "sticky", top: 80 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5, color: "text.secondary" }}>
              Navigation
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button fullWidth variant="contained" onClick={() => router.push("/admin/users")}>
                👥 Gérer les abonnés
              </Button>
              <Button fullWidth variant="contained" onClick={() => router.push("/admin/properties")}>
                🏠 Délais de publication
              </Button>
              <Button fullWidth variant="contained" color="secondary" onClick={() => router.push("/admin/revenues")}>
                💳 Paiements &amp; Revenus
              </Button>
              <Button fullWidth variant="contained" color="info" onClick={() => router.push("/admin/contacts")}>
                📋 Base contacts / CRM
              </Button>
              <Button fullWidth variant="outlined" color="success" onClick={() => router.push("/admin/newsletter")}>
                📧 Newsletter
              </Button>
              <Button fullWidth variant="outlined" onClick={() => router.push("/admin/profile")}>
                ⚙️ Mon profil
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>{/* fin layout 2 colonnes */}

      <Divider sx={{ my: 3 }} />

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Typography variant="h6" sx={{ mb: 1 }}>Annonces par pays</Typography>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pays</TableCell>
                  <TableCell align="right">Annonces</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(byCountry).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
                  <TableRow key={c}>
                    <TableCell>{c}</TableCell>
                    <TableCell align="right">{n}</TableCell>
                  </TableRow>
                ))}
                {Object.keys(byCountry).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} align="center" sx={{ color: "text.secondary" }}>
                      Aucune annonce
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6">Top annonceurs (CA ImmoBF)</Typography>
            <Button size="small" variant="outlined" onClick={() => router.push("/admin/revenues")}>
              Voir tous
            </Button>
          </Box>
          <Paper>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Nom</TableCell>
                  <TableCell>Pays</TableCell>
                  <TableCell align="right">Annonces</TableCell>
                  <TableCell align="right">Total paye</TableCell>
                  <TableCell>Derniere activite</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {top5.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{a.full_name || "ND"}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.phone}</Typography>
                    </TableCell>
                    <TableCell>{a.main_country || "ND"}</TableCell>
                    <TableCell align="right">{a.nb_annonces}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#1B6B3A" }}>
                      {formatFCFA(a.total_paid)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {a.last_payment_at
                          ? new Date(a.last_payment_at).toLocaleDateString("fr-FR")
                          : "ND"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {top5.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: "text.secondary" }}>
                      Aucune donnee
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">20 dernieres transactions</Typography>
        <Button size="small" variant="outlined" onClick={exportCsv}>Exporter CSV</Button>
      </Box>
      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Annonceur</TableCell>
              <TableCell>Pays</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Fournisseur</TableCell>
              <TableCell align="right">Montant</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.slice(0, 20).map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Typography variant="caption">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{t.buyer_name || "ND"}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.buyer_phone || t.buyer_email || ""}
                  </Typography>
                </TableCell>
                <TableCell>{t.property_country || "ND"}</TableCell>
                <TableCell>
                  <Typography variant="caption">{PURPOSE_LABEL[t.purpose] || t.purpose}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{t.provider}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatFCFA(t.amount)}
                </TableCell>
                <TableCell>
                  <Chip label={t.status} size="small" color={STATUS_COLOR[t.status] || "default"} />
                </TableCell>
              </TableRow>
            ))}
            {transactions.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                  Aucune transaction
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Layout>
  );
}
