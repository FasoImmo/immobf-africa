"use client";
import { useState, useEffect } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";
import {
  Box, Typography, Alert, CircularProgress, Button, Chip, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Grid, Divider, IconButton, Collapse,
} from "@mui/material";
import SendIcon           from "@mui/icons-material/Send";
import RefreshIcon        from "@mui/icons-material/Refresh";
import ExpandMoreIcon     from "@mui/icons-material/ExpandMore";
import ExpandLessIcon     from "@mui/icons-material/ExpandLess";
import PhotoCameraIcon    from "@mui/icons-material/PhotoCamera";
import LocationOnIcon     from "@mui/icons-material/LocationOn";
import DescriptionIcon    from "@mui/icons-material/Description";
import AttachMoneyIcon    from "@mui/icons-material/AttachMoney";
import SquareFootIcon     from "@mui/icons-material/SquareFoot";
import CheckCircleIcon    from "@mui/icons-material/CheckCircle";

const ISSUE_ICONS = {
  no_photos:         <PhotoCameraIcon fontSize="inherit" />,
  few_photos:        <PhotoCameraIcon fontSize="inherit" />,
  no_gps:            <LocationOnIcon  fontSize="inherit" />,
  short_description: <DescriptionIcon fontSize="inherit" />,
  no_price:          <AttachMoneyIcon fontSize="inherit" />,
  no_city:           <LocationOnIcon  fontSize="inherit" />,
  no_surface:        <SquareFootIcon  fontSize="inherit" />,
};

const SEVERITY_COLOR = {
  critical:   { bg: "#fef2f2", border: "#fca5a5", text: "#c62828" },
  warning:    { bg: "#fffbeb", border: "#fcd34d", text: "#b45309" },
  suggestion: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
};

function ScoreBar({ score }) {
  const color = score < 40 ? "#ef4444" : score < 70 ? "#f59e0b" : "#22c55e";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 130 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={score}
          sx={{
            height: 8, borderRadius: 4,
            bgcolor: "#e2e8f0",
            "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
          }}
        />
      </Box>
      <Typography sx={{ fontWeight: 700, color, fontSize: 13, minWidth: 38 }}>
        {score}/100
      </Typography>
    </Box>
  );
}

function IssueBadge({ issue }) {
  const s = SEVERITY_COLOR[issue.severity] || SEVERITY_COLOR.suggestion;
  return (
    <Tooltip title={issue.tip} arrow placement="top">
      <Chip
        icon={<span style={{ fontSize: 14, color: s.text }}>{ISSUE_ICONS[issue.code] || "•"}</span>}
        label={issue.label}
        size="small"
        sx={{
          bgcolor: s.bg,
          border: `1px solid ${s.border}`,
          color: s.text,
          fontWeight: 600,
          fontSize: 11,
          cursor: "help",
          m: 0.3,
        }}
      />
    </Tooltip>
  );
}

function PropertyRow({ p }) {
  const [open, setOpen] = useState(false);
  const rowBg = p.score < 40 ? "#fef2f2" : p.score < 70 ? "#fffbeb" : "#f0fdf4";

  return (
    <>
      <TableRow
        sx={{ bgcolor: rowBg, "&:hover": { filter: "brightness(0.97)" }, cursor: "pointer" }}
        onClick={() => setOpen((v) => !v)}
      >
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}>
              {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 13, color: "#0F172A" }}>
                {p.title || "Sans titre"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B" }}>
                {[p.city, p.country_code].filter(Boolean).join(", ") || "—"}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography sx={{ fontSize: 12, color: "#475569" }}>
            {p.owner_name || "—"}<br/>
            <span style={{ color: "#94A3B8" }}>{p.owner_email || ""}</span>
          </Typography>
        </TableCell>
        <TableCell><ScoreBar score={p.score} /></TableCell>
        <TableCell>
          {p.issues.length === 0
            ? <CheckCircleIcon sx={{ color: "#22c55e", fontSize: 20 }} />
            : <Stack direction="row" flexWrap="wrap">
                {p.issues.map((i) => <IssueBadge key={i.code} issue={i} />)}
              </Stack>
          }
        </TableCell>
        <TableCell sx={{ fontSize: 12, color: "#64748B" }}>
          {p.quality_alert_sent_at
            ? new Date(p.quality_alert_sent_at).toLocaleDateString("fr-FR")
            : <em style={{ color: "#94A3B8" }}>Jamais</em>}
        </TableCell>
      </TableRow>

      {/* Détail dépliable */}
      <TableRow>
        <TableCell colSpan={5} sx={{ p: 0, border: 0 }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: "#f8fafc", px: 4, py: 2, borderBottom: "1px solid #E2E8F0" }}>
              {p.issues.length === 0
                ? <Typography sx={{ color: "#22c55e", fontWeight: 600 }}>✓ Cette annonce est complète et optimisée.</Typography>
                : p.issues.map((issue) => {
                    const s = SEVERITY_COLOR[issue.severity] || SEVERITY_COLOR.suggestion;
                    return (
                      <Box
                        key={issue.code}
                        sx={{
                          display: "flex", gap: 1.5, alignItems: "flex-start",
                          p: 1.5, mb: 1, borderRadius: 1.5,
                          bgcolor: s.bg, border: `1px solid ${s.border}`,
                        }}
                      >
                        <span style={{ color: s.text, fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                          {ISSUE_ICONS[issue.code]}
                        </span>
                        <Box>
                          <Typography sx={{ fontWeight: 700, color: s.text, fontSize: 13 }}>
                            {issue.label}
                          </Typography>
                          <Typography sx={{ color: "#475569", fontSize: 12, mt: 0.3 }}>
                            {issue.tip}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
              }
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ListingQualityPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Dialog d'envoi
  const [sendDialog, setSendDialog] = useState(false);
  const [force,      setForce]      = useState(false);
  const [sending,    setSending]    = useState(false);
  const [sendResult, setSendResult] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      setData(await Admin.listingQuality());
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSend() {
    setSending(true); setSendResult(null);
    try {
      const r = await Admin.runListingQualityAlerts(force);
      setSendResult(r);
      load(); // refresh
    } catch (e) {
      setSendResult({ error: e.response?.data?.error?.message || e.message });
    } finally {
      setSending(false);
    }
  }

  const props = data?.properties || [];

  return (
    <AdminLayout title="Qualité annonces — ImmoBF Africa">
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>

        {/* ── En-tête ─────────────────────────────────────────── */}
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 3 }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#0F172A">
              Qualité des annonces
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14, mt: 0.5 }}>
              Analyse automatique : photos, GPS, description, prix, ville. Emails de conseil envoyés aux annonceurs chaque lundi.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5} flexShrink={0}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}
              sx={{ borderColor: "#CBD5E1", color: "#64748B" }}>
              Actualiser
            </Button>
            <Button variant="contained" startIcon={<SendIcon />} onClick={() => { setSendDialog(true); setSendResult(null); }}
              sx={{ bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0a6355" }, fontWeight: 600 }}>
              Envoyer les conseils
            </Button>
          </Stack>
        </Stack>

        {/* ── KPIs ────────────────────────────────────────────── */}
        {data && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "Total annonces",   value: data.total,       color: "#6366F1" },
              { label: "Score critique (<40)", value: data.nb_critical, color: "#ef4444" },
              { label: "À améliorer (40-69)", value: data.nb_warning,  color: "#f59e0b" },
              { label: "Bonnes (≥70)",     value: data.nb_good,     color: "#22c55e" },
            ].map((kpi) => (
              <Grid item xs={6} sm={3} key={kpi.label}>
                <Paper sx={{ p: 2, borderRadius: 2, textAlign: "center", border: `1px solid ${kpi.color}33`, bgcolor: kpi.color + "0D" }}>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>{kpi.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* ── Chargement / erreur ──────────────────────────────── */}
        {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress sx={{ color: "#0E7C66" }} /></Box>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── Tableau ──────────────────────────────────────────── */}
        {!loading && props.length > 0 && (
          <Paper sx={{ borderRadius: 2, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#0F172A" }}>
                    {["Annonce", "Propriétaire", "Score qualité", "Problèmes détectés", "Dernier email"].map((h) => (
                      <TableCell key={h} sx={{ color: "#94A3B8", fontWeight: 600, fontSize: 12, py: 1.5 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {props.map((p) => <PropertyRow key={p.id} p={p} />)}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {!loading && props.length === 0 && data && (
          <Box sx={{ textAlign: "center", py: 8, color: "#94A3B8" }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: "#22c55e", mb: 1 }} />
            <Typography>Toutes les annonces publiées sont complètes.</Typography>
          </Box>
        )}

        {/* ── Dialog d'envoi ───────────────────────────────────── */}
        <Dialog open={sendDialog} onClose={() => !sending && setSendDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle fontWeight={700}>Envoyer les emails de conseil qualité</DialogTitle>
          <DialogContent>
            {sendResult
              ? sendResult.error
                ? <Alert severity="error">{sendResult.error}</Alert>
                : <Alert severity="success">
                    <strong>{sendResult.sent} annonceur(s)</strong> notifié(s) —{" "}
                    {sendResult.skipped} annonce(s) ignorée(s) (déjà notifiées ou bonnes){sendResult.errors > 0 ? ` — ${sendResult.errors} erreur(s)` : ""}.
                  </Alert>
              : <>
                  <Typography sx={{ mb: 2 }}>
                    Le système va analyser toutes les annonces publiées et envoyer un email personnalisé
                    à chaque annonceur ayant au moins une annonce avec un score &lt; 80.
                  </Typography>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Par défaut, un email n'est renvoyé que si la dernière notification date de plus de 7 jours.
                  </Alert>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <input
                      type="checkbox"
                      id="force-cb"
                      checked={force}
                      onChange={(e) => setForce(e.target.checked)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <label htmlFor="force-cb" style={{ fontSize: 14, cursor: "pointer", color: "#475569" }}>
                      Ignorer l'anti-spam (renvoyer même si notifié récemment)
                    </label>
                  </Stack>
                </>
            }
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSendDialog(false)} disabled={sending}>Fermer</Button>
            {!sendResult && (
              <Button
                variant="contained"
                startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                onClick={handleSend}
                disabled={sending}
                sx={{ bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0a6355" }, fontWeight: 600 }}
              >
                {sending ? "Envoi en cours…" : "Lancer l'envoi"}
              </Button>
            )}
          </DialogActions>
        </Dialog>

      </Box>
    </AdminLayout>
  );
}
