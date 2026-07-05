import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, CircularProgress, Chip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack,
} from "@mui/material";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

const STATUS_META = {
  active:         { label: "Active",          color: "success" },
  expiring_soon:  { label: "Expire bientôt",  color: "warning" },
  expired:        { label: "Expirée",          color: "error"   },
  no_subscription:{ label: "Sans abonnement", color: "default" },
  suspended:      { label: "Suspendue",        color: "error"   },
};

export default function AdminProperties() {
  const router = useRouter();
  const [authorized, setAuthorized]   = useState(null);
  const [properties, setProperties]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [actingId, setActingId]       = useState(null);

  // --- Dialogs état ---
  const [extendDialog, setExtendDialog] = useState({ open: false, prop: null, days: 30, note: "" });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, prop: null, note: "" });
  const [actionMsg, setActionMsg] = useState(null); // { severity, text }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) { router.replace("/login?redirect=/admin/properties"); return; }
    let user = null;
    try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!user || user.role !== "admin") { setAuthorized(false); return; }
    setAuthorized(true);
  }, []); // eslint-disable-line

  function load() {
    setLoading(true); setError(null);
    Admin.properties({ limit: 300 })
      .then((d) => setProperties(d.properties || []))
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authorized !== true) return;
    load();
  }, [authorized]); // eslint-disable-line

  async function handleDelete(p) {
    if (!window.confirm(`Supprimer définitivement l'annonce "${p.title}" de ${p.owner_name || p.owner_phone} ?`)) return;
    setActingId(p.id);
    try {
      await Admin.deleteProperty(p.id);
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setActingId(null);
    }
  }

  async function handleExtend() {
    const { prop, days, note } = extendDialog;
    setActingId(prop.id);
    setExtendDialog((d) => ({ ...d, open: false }));
    try {
      const { property } = await Admin.extendListing(prop.id, Number(days), note || undefined);
      setProperties((prev) => prev.map((p) => p.id === property.id ? { ...p, listing_expires_at: property.listing_expires_at } : p));
      setActionMsg({ severity: "success", text: `Annonce "${prop.title}" prolongée de ${days} jour(s). Email envoyé à l'annonceur.` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setActingId(null);
    }
  }

  async function handleSuspend() {
    const { prop, note } = suspendDialog;
    setActingId(prop.id);
    setSuspendDialog((d) => ({ ...d, open: false }));
    try {
      await Admin.suspendListing(prop.id, note || undefined);
      setProperties((prev) => prev.map((p) => p.id === prop.id ? { ...p, status: "suspended" } : p));
      setActionMsg({ severity: "warning", text: `Annonce "${prop.title}" suspendue. Email envoyé à l'annonceur.` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setActingId(null);
    }
  }

  async function handleRestore(p) {
    setActingId(p.id);
    try {
      await Admin.restoreListing(p.id);
      setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "published" } : x));
      setActionMsg({ severity: "success", text: `Annonce "${p.title}" réactivée. Email envoyé à l'annonceur.` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally {
      setActingId(null);
    }
  }

  if (authorized === null) {
    return (
      <Layout title="Délais de publication — Admin"><Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box></Layout>
    );
  }
  if (authorized === false) {
    return (
      <Layout title="Délais de publication — Admin">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>Accès refusé</Typography>
          <Typography color="text.secondary">Cette page est réservée aux administrateurs du site.</Typography>
        </Paper>
      </Layout>
    );
  }

  const expiringCount = properties.filter((p) => p.subscription_status === "expiring_soon").length;
  const expiredCount  = properties.filter((p) => p.subscription_status === "expired").length;
  const suspendedCount = properties.filter((p) => p.status === "suspended").length;

  return (
    <Layout title="Délais de publication — Admin">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Annonces ({properties.length})</Typography>
        <Button onClick={() => router.push("/admin")} variant="outlined">Retour au tableau de bord</Button>
      </Box>

      {(expiringCount > 0 || expiredCount > 0 || suspendedCount > 0) && (
        <Alert severity={expiredCount > 0 || suspendedCount > 0 ? "error" : "warning"} sx={{ mb: 2 }}>
          {expiredCount > 0 && `${expiredCount} annonce(s) expirée(s). `}
          {suspendedCount > 0 && `${suspendedCount} annonce(s) suspendue(s). `}
          {expiringCount > 0 && `${expiringCount} annonce(s) expire(nt) dans moins de 7 jours.`}
        </Alert>
      )}

      {actionMsg && (
        <Alert severity={actionMsg.severity} onClose={() => setActionMsg(null)} sx={{ mb: 2 }}>
          {actionMsg.text}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

      {!loading && (
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Annonce</TableCell>
                <TableCell>Propriétaire</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell align="right">Prix</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Jours restants</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {properties.map((p) => {
                const isSuspended = p.status === "suspended";
                const meta = isSuspended
                  ? STATUS_META.suspended
                  : (STATUS_META[p.subscription_status] || STATUS_META.no_subscription);
                const busy = actingId === p.id;
                return (
                  <TableRow key={p.id}>
                    <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.title}
                    </TableCell>
                    <TableCell>{p.owner_name || "—"}{p.owner_phone ? ` (${p.owner_phone})` : ""}</TableCell>
                    <TableCell>{p.city}</TableCell>
                    <TableCell align="right">{formatFCFA(p.price)}</TableCell>
                    <TableCell><Chip label={meta.label} color={meta.color} size="small" /></TableCell>
                    <TableCell align="right">
                      {p.days_remaining != null ? p.days_remaining : "—"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {/* Prolonger — toujours disponible */}
                        <Button
                          size="small" color="primary" variant="outlined"
                          disabled={busy}
                          onClick={() => setExtendDialog({ open: true, prop: p, days: 30, note: "" })}
                        >
                          ⏱ Prolonger
                        </Button>

                        {/* Suspendre — uniquement si published ou pending */}
                        {!isSuspended && (p.status === "published" || p.status === "pending") && (
                          <Button
                            size="small" color="warning" variant="outlined"
                            disabled={busy}
                            onClick={() => setSuspendDialog({ open: true, prop: p, note: "" })}
                          >
                            ⏸ Suspendre
                          </Button>
                        )}

                        {/* Réactiver — uniquement si suspendue */}
                        {isSuspended && (
                          <Button
                            size="small" color="success" variant="outlined"
                            disabled={busy}
                            onClick={() => handleRestore(p)}
                          >
                            ▶ Réactiver
                          </Button>
                        )}

                        <Button
                          size="small" color="error" variant="outlined"
                          disabled={busy}
                          onClick={() => handleDelete(p)}
                        >
                          🗑 Suppr.
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Dialog — Prolonger */}
      <Dialog open={extendDialog.open} onClose={() => setExtendDialog((d) => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>⏱ Prolonger l'annonce</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>{extendDialog.prop?.title}</strong>
          </Typography>
          <TextField
            label="Nombre de jours à ajouter"
            type="number"
            inputProps={{ min: 1, max: 365 }}
            value={extendDialog.days}
            onChange={(e) => setExtendDialog((d) => ({ ...d, days: e.target.value }))}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Note interne (optionnelle, non envoyée à l'annonceur)"
            value={extendDialog.note}
            onChange={(e) => setExtendDialog((d) => ({ ...d, note: e.target.value }))}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialog((d) => ({ ...d, open: false }))}>Annuler</Button>
          <Button onClick={handleExtend} variant="contained" disabled={!extendDialog.days || Number(extendDialog.days) < 1}>
            Prolonger
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Suspendre */}
      <Dialog open={suspendDialog.open} onClose={() => setSuspendDialog((d) => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>⏸ Suspendre l'annonce</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            L'annonce <strong>{suspendDialog.prop?.title}</strong> sera masquée des visiteurs.
            Un email sera envoyé automatiquement à l'annonceur.
          </Typography>
          <TextField
            label="Motif (envoyé à l'annonceur dans l'email)"
            value={suspendDialog.note}
            onChange={(e) => setSuspendDialog((d) => ({ ...d, note: e.target.value }))}
            fullWidth
            multiline
            rows={3}
            placeholder="Ex : Photos manquantes, contenu non conforme…"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialog((d) => ({ ...d, open: false }))}>Annuler</Button>
          <Button onClick={handleSuspend} variant="contained" color="warning">
            Suspendre
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
}
