"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, Card, CardContent, Chip, Switch, FormControlLabel,
  TextField, Button, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Alert, Skeleton, Tooltip, Stack,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockIcon              from "@mui/icons-material/Block";
import ScheduleIcon           from "@mui/icons-material/Schedule";
import AdminLayout            from "../../components/AdminLayout";
import { Admin }              from "../../lib/api";

/* ─── Labels visuels par provider ───────────────────────────────────────── */
const PROVIDER_LABELS = {
  cinetpay:        { name: "CinetPay",        color: "#E67E22" },
  orange_money_bf: { name: "Orange Money BF", color: "#E05C00" },
  wave:            { name: "Wave",            color: "#1A56DB" },
  flutterwave:     { name: "Flutterwave",     color: "#FF6B35" },
  fedapay:         { name: "FedaPay",         color: "#0E7C66" },
  paydunya:        { name: "PayDunya",        color: "#6C3483" },
  moov_money_bf:   { name: "Moov Money BF",  color: "#008B8B" },
  pawapay:         { name: "PawaPay",        color: "#2E86AB" },
};

const C_ACTIVE = "#0E7C66";

function fmtCFA(amount) {
  if (!amount && amount !== 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency: "XOF", maximumFractionDigits: 0,
  }).format(amount);
}

function fmtDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function toLocalDatetimeValue(iso) {
  if (!iso) return "";
  // Convert UTC ISO to local datetime-local value (YYYY-MM-DDTHH:mm)
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StatusChip({ enabled }) {
  return enabled
    ? <Chip icon={<CheckCircleOutlineIcon sx={{ fontSize: "14px !important" }} />} label="Actif" size="small" sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 600, fontSize: 12 }} />
    : <Chip icon={<BlockIcon sx={{ fontSize: "14px !important" }} />}              label="Désactivé" size="small" sx={{ bgcolor: "#FEE2E2", color: "#991B1B", fontWeight: 600, fontSize: 12 }} />;
}

/* ─── Card d'un fournisseur ─────────────────────────────────────────────── */
function ProviderCard({ provider, onSave }) {
  const label = PROVIDER_LABELS[provider.id] || { name: provider.id, color: "#64748B" };

  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState(null);
  const [form,      setForm]      = useState({
    enabled:               provider.enabled,
    disabled_reason:       provider.disabled_reason || "",
    scheduled_disable_at:  toLocalDatetimeValue(provider.scheduled_disable_at),
    scheduled_enable_at:   toLocalDatetimeValue(provider.scheduled_enable_at),
  });

  function handleToggle(e) {
    setForm((f) => ({ ...f, enabled: e.target.checked, disabled_reason: e.target.checked ? "" : f.disabled_reason }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const payload = {
        enabled: form.enabled,
        disabled_reason:      form.disabled_reason || null,
        scheduled_disable_at: form.scheduled_disable_at ? new Date(form.scheduled_disable_at).toISOString() : null,
        scheduled_enable_at:  form.scheduled_enable_at  ? new Date(form.scheduled_enable_at).toISOString()  : null,
      };
      await Admin.updatePaymentProvider(provider.id, payload);
      setSuccess(true);
      onSave(provider.id, payload);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  const hasScheduled = provider.scheduled_disable_at || provider.scheduled_enable_at;

  return (
    <Card elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2, height: "100%" }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: label.color, flexShrink: 0 }} />
            <Typography fontWeight={700} fontSize={15} color="#0F172A">{label.name}</Typography>
          </Box>
          <StatusChip enabled={form.enabled} />
        </Box>

        {/* Toggle instantané */}
        <FormControlLabel
          control={
            <Switch
              checked={form.enabled}
              onChange={handleToggle}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: C_ACTIVE },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: C_ACTIVE },
              }}
            />
          }
          label={
            <Typography fontSize={13} color="#475569">
              {form.enabled ? "Paiements activés" : "Paiements désactivés"}
            </Typography>
          }
          sx={{ mb: 1.5 }}
        />

        {/* Raison de désactivation */}
        {!form.enabled && (
          <TextField
            label="Raison (optionnel)"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={form.disabled_reason}
            onChange={(e) => setForm((f) => ({ ...f, disabled_reason: e.target.value }))}
            sx={{ mb: 1.5 }}
            inputProps={{ maxLength: 255 }}
          />
        )}

        <Divider sx={{ my: 1.5 }} />

        {/* Programmation */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
          <ScheduleIcon sx={{ fontSize: 15, color: "#94A3B8" }} />
          <Typography fontSize={12.5} fontWeight={600} color="#64748B" textTransform="uppercase" letterSpacing={0.5}>
            Programmation
          </Typography>
        </Box>

        <Stack spacing={1.5} sx={{ mb: 1.5 }}>
          <TextField
            label="Désactiver le (date/heure)"
            type="datetime-local"
            size="small"
            fullWidth
            value={form.scheduled_disable_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_disable_at: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Réactiver le (date/heure)"
            type="datetime-local"
            size="small"
            fullWidth
            value={form.scheduled_enable_at}
            onChange={(e) => setForm((f) => ({ ...f, scheduled_enable_at: e.target.value }))}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {hasScheduled && (
          <Box sx={{ mb: 1.5, p: 1.25, bgcolor: "#FFFBEB", borderRadius: 1.5, border: "1px solid #FDE68A" }}>
            {provider.scheduled_disable_at && (
              <Typography fontSize={12} color="#92400E">
                ⏰ Désactivation prévue : {fmtDT(provider.scheduled_disable_at)}
              </Typography>
            )}
            {provider.scheduled_enable_at && (
              <Typography fontSize={12} color="#92400E" sx={{ mt: 0.5 }}>
                ✅ Réactivation prévue : {fmtDT(provider.scheduled_enable_at)}
              </Typography>
            )}
          </Box>
        )}

        {error   && <Alert severity="error"   sx={{ mb: 1, py: 0.5, fontSize: 13 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1, py: 0.5, fontSize: 13 }}>Sauvegardé !</Alert>}

        <Button
          fullWidth
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={saving}
          sx={{ bgcolor: C_ACTIVE, "&:hover": { bgcolor: "#0B6A57" }, textTransform: "none", fontWeight: 600 }}
        >
          {saving ? "Enregistrement…" : "Appliquer"}
        </Button>

        {provider.updated_at && (
          <Typography fontSize={11} color="#94A3B8" textAlign="center" sx={{ mt: 1 }}>
            Modifié le {fmtDT(provider.updated_at)}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Tableau de stats ───────────────────────────────────────────────────── */
function StatsTable({ providers }) {
  const rows = providers.map((p) => ({
    id:   p.id,
    name: (PROVIDER_LABELS[p.id] || { name: p.id }).name,
    enabled: p.enabled,
    all:  p.stats_all  || {},
    d30:  p.stats_30d  || {},
  }));

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #E2E8F0", borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "#F8FAFC" }}>
            <TableCell sx={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>Fournisseur</TableCell>
            <TableCell align="center" sx={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>Statut</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12, borderLeft: "1px solid #E2E8F0" }}>✅ OK (total)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12 }}>❌ Échec (total)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12 }}>💰 Revenus (total)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12, borderLeft: "1px solid #E2E8F0" }}>✅ OK (30j)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12 }}>❌ Échec (30j)</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, color: "#64748B", fontSize: 12 }}>💰 Revenus (30j)</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id} hover sx={{ "&:last-child td": { border: 0 } }}>
              <TableCell>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: (PROVIDER_LABELS[r.id] || {}).color || "#64748B", flexShrink: 0 }} />
                  <Typography fontSize={13} fontWeight={500}>{r.name}</Typography>
                </Box>
              </TableCell>
              <TableCell align="center">
                <StatusChip enabled={r.enabled} />
              </TableCell>
              {/* All-time */}
              <TableCell align="right" sx={{ fontSize: 13, borderLeft: "1px solid #F1F5F9" }}>
                <Typography fontSize={13} color={r.all.nb_succeeded > 0 ? "#166534" : "#94A3B8"} fontWeight={r.all.nb_succeeded > 0 ? 600 : 400}>
                  {r.all.nb_succeeded ?? "—"}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13 }}>
                <Typography fontSize={13} color={r.all.nb_failed > 0 ? "#991B1B" : "#94A3B8"}>
                  {r.all.nb_failed ?? "—"}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                {fmtCFA(r.all.total_revenue)}
              </TableCell>
              {/* 30-day */}
              <TableCell align="right" sx={{ fontSize: 13, borderLeft: "1px solid #F1F5F9" }}>
                <Typography fontSize={13} color={r.d30.nb_succeeded > 0 ? "#166534" : "#94A3B8"} fontWeight={r.d30.nb_succeeded > 0 ? 600 : 400}>
                  {r.d30.nb_succeeded ?? "—"}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13 }}>
                <Typography fontSize={13} color={r.d30.nb_failed > 0 ? "#991B1B" : "#94A3B8"}>
                  {r.d30.nb_failed ?? "—"}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                {fmtCFA(r.d30.total_revenue)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/* ─── Page principale ────────────────────────────────────────────────────── */
export default function PaymentProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await Admin.listPaymentProviders();
      setProviders(data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || "Impossible de charger les fournisseurs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSave(id, patch) {
    setProviders((prev) =>
      prev.map((p) => p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p)
    );
  }

  return (
    <AdminLayout title="Fournisseurs paiement — ImmoBF Africa">
      <Box sx={{ maxWidth: 1300, mx: "auto" }}>

        {/* ── En-tête ── */}
        <Box sx={{ mb: 3, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#0F172A">
              Fournisseurs de paiement
            </Typography>
            <Typography color="#64748B" fontSize={14} sx={{ mt: 0.25 }}>
              Activez, désactivez ou programmez chaque mode de paiement. Le cron vérifie les changements programmés toutes les minutes.
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={load} disabled={loading}
            sx={{ borderColor: "#CBD5E1", color: "#64748B", textTransform: "none", fontWeight: 600 }}>
            {loading ? "Chargement…" : "↻ Actualiser"}
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {/* ── Grille de cards ── */}
        {loading ? (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {providers.map((p) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
                <ProviderCard provider={p} onSave={handleSave} />
              </Grid>
            ))}
          </Grid>
        )}

        {/* ── Tableau de bilan ── */}
        <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight={700} color="#0F172A">Bilan par fournisseur</Typography>
          <Chip label="Tout" size="small" sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontSize: 11 }} />
          <Chip label="30 derniers jours" size="small" sx={{ bgcolor: "#EFF6FF", color: "#1D4ED8", fontSize: 11 }} />
        </Box>

        {loading ? (
          <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
        ) : (
          <StatsTable providers={providers} />
        )}

        {/* ── Légende ── */}
        {!loading && (
          <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
            {providers.map((p) => {
              const l = PROVIDER_LABELS[p.id] || { name: p.id, color: "#64748B" };
              return (
                <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: l.color }} />
                  <Typography fontSize={12} color="#64748B">{l.name}</Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </AdminLayout>
  );
}
