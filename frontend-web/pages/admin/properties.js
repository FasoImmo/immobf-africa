import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, CircularProgress, Chip, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Stack, Grid, MenuItem,
} from "@mui/material";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

const STATUS_META = {
  active:         { label: "Active",          color: "success" },
  expiring_soon:  { label: "Expire bientôt",  color: "warning" },
  expired:        { label: "Expirée",          color: "error"   },
  no_subscription:{ label: "Sans abonnement", color: "default" },
  suspended:      { label: "Suspendue",        color: "error"   },
};

const TYPE_LABELS = {
  house: "Maison", apartment: "Appartement", land: "Terrain",
  commercial: "Commerce", office: "Bureau", villa: "Villa", other: "Autre",
};

const DAYS_FILTER_LABEL = {
  "": "Tous", expired: "Expirées", lt7: "< 7 jours", lt30: "< 30 jours", gt30: "> 30 jours",
};

export default function AdminProperties() {
  const router = useRouter();
  const [authorized, setAuthorized]   = useState(null);
  const [properties, setProperties]   = useState([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [actingId, setActingId]       = useState(null);

  // Filtres
  const [filterType,    setFilterType]    = useState("");
  const [filterOwner,   setFilterOwner]   = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");
  const [filterDays,    setFilterDays]    = useState("");
  const [groupBy,       setGroupBy]       = useState("");

  // Dialogs
  const [extendDialog,  setExtendDialog]  = useState({ open: false, prop: null, days: 30, note: "" });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, prop: null, note: "" });
  const [actionMsg,     setActionMsg]     = useState(null);

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
    Admin.properties({ limit: 500 })
      .then((d) => setProperties(d.properties || []))
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (authorized !== true) return;
    load();
  }, [authorized]); // eslint-disable-line

  // Valeurs uniques pour les dropdowns
  const uniqueTypes     = useMemo(() => [...new Set(properties.map((p) => p.type).filter(Boolean))].sort(), [properties]);
  const uniqueCountries = useMemo(() => [...new Set(properties.map((p) => p.country_code).filter(Boolean))].sort(), [properties]);
  const uniqueOwners    = useMemo(() => [...new Set(properties.map((p) => p.owner_name || p.owner_phone).filter(Boolean))].sort(), [properties]);

  // Filtrage
  const filtered = useMemo(() => {
    return properties.filter((p) => {
      const isSuspended = p.status === "suspended";
      const effectiveStatus = isSuspended ? "suspended" : (p.subscription_status || "no_subscription");
      if (filterType    && p.type !== filterType) return false;
      if (filterCountry && p.country_code !== filterCountry) return false;
      if (filterStatus  && effectiveStatus !== filterStatus) return false;
      if (filterOwner) {
        const q = filterOwner.toLowerCase();
        const name  = (p.owner_name  || "").toLowerCase();
        const phone = (p.owner_phone || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q)) return false;
      }
      if (filterDays) {
        const d = p.days_remaining;
        if (filterDays === "expired" && !(d != null && d < 0)) return false;
        if (filterDays === "lt7"  && !(d != null && d >= 0 && d < 7))  return false;
        if (filterDays === "lt30" && !(d != null && d >= 0 && d < 30)) return false;
        if (filterDays === "gt30" && !(d != null && d >= 30))          return false;
      }
      return true;
    });
  }, [properties, filterType, filterOwner, filterCountry, filterStatus, filterDays]);

  // Regroupement
  const grouped = useMemo(() => {
    if (!groupBy) return [["", filtered]];
    const map = new Map();
    filtered.forEach((p) => {
      let key = "";
      if (groupBy === "type")    key = TYPE_LABELS[p.type] || p.type || "Inconnu";
      if (groupBy === "owner")   key = p.owner_name || p.owner_phone || "Inconnu";
      if (groupBy === "country_code") key = p.country_code || "—";
      if (groupBy === "subscription_status") {
        const s = p.status === "suspended" ? "suspended" : (p.subscription_status || "no_subscription");
        key = STATUS_META[s]?.label || s;
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupBy]);

  const anyFilter = filterType || filterOwner || filterCountry || filterStatus || filterDays;
  function resetFilters() {
    setFilterType(""); setFilterOwner(""); setFilterCountry("");
    setFilterStatus(""); setFilterDays("");
  }

  async function handleDelete(p) {
    if (!window.confirm(`Supprimer définitivement l'annonce "${p.title}" de ${p.owner_name || p.owner_phone} ?`)) return;
    setActingId(p.id);
    try {
      await Admin.deleteProperty(p.id);
      setProperties((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  async function handleExtend() {
    const { prop, days, note } = extendDialog;
    setActingId(prop.id);
    setExtendDialog((d) => ({ ...d, open: false }));
    try {
      const { property } = await Admin.extendListing(prop.id, Number(days), note || undefined);
      setProperties((prev) => prev.map((p) => p.id === property.id ? { ...p, listing_expires_at: property.listing_expires_at } : p));
      setActionMsg({ severity: "success", text: `Annonce "${prop.title}" prolongée de ${days} jour(s).` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  async function handleSuspend() {
    const { prop, note } = suspendDialog;
    setActingId(prop.id);
    setSuspendDialog((d) => ({ ...d, open: false }));
    try {
      await Admin.suspendListing(prop.id, note || undefined);
      setProperties((prev) => prev.map((p) => p.id === prop.id ? { ...p, status: "suspended" } : p));
      setActionMsg({ severity: "warning", text: `Annonce "${prop.title}" suspendue.` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  async function handleRestore(p) {
    setActingId(p.id);
    try {
      await Admin.restoreListing(p.id);
      setProperties((prev) => prev.map((x) => x.id === p.id ? { ...x, status: "published" } : x));
      setActionMsg({ severity: "success", text: `Annonce "${p.title}" réactivée.` });
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  function PropertyRow({ p }) {
    const isSuspended = p.status === "suspended";
    const meta = isSuspended ? STATUS_META.suspended : (STATUS_META[p.subscription_status] || STATUS_META.no_subscription);
    const busy = actingId === p.id;
    return (
      <TableRow key={p.id}>
        <TableCell sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.title}
        </TableCell>
        {!groupBy || groupBy !== "type" ? (
          <TableCell>{TYPE_LABELS[p.type] || p.type || "—"}</TableCell>
        ) : null}
        {!groupBy || groupBy !== "owner" ? (
          <TableCell sx={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.owner_name || "—"}{p.owner_phone ? ` (${p.owner_phone})` : ""}
          </TableCell>
        ) : null}
        {!groupBy || groupBy !== "country_code" ? (
          <TableCell>{p.country_code || "—"}</TableCell>
        ) : null}
        <TableCell sx={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.city}
        </TableCell>
        <TableCell align="right">{formatFCFA(p.price)}</TableCell>
        {!groupBy || groupBy !== "subscription_status" ? (
          <TableCell><Chip label={meta.label} color={meta.color} size="small" /></TableCell>
        ) : null}
        <TableCell align="right">
          {p.days_remaining != null ? p.days_remaining : "—"}
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Button size="small" color="primary" variant="outlined" disabled={busy}
              onClick={() => setExtendDialog({ open: true, prop: p, days: 30, note: "" })}>
              ⏱ Prolonger
            </Button>
            {!isSuspended && (p.status === "published" || p.status === "pending") && (
              <Button size="small" color="warning" variant="outlined" disabled={busy}
                onClick={() => setSuspendDialog({ open: true, prop: p, note: "" })}>
                ⏸ Suspendre
              </Button>
            )}
            {isSuspended && (
              <Button size="small" color="success" variant="outlined" disabled={busy}
                onClick={() => handleRestore(p)}>
                ▶ Réactiver
              </Button>
            )}
            <Button size="small" color="error" variant="outlined" disabled={busy}
              onClick={() => handleDelete(p)}>
              🗑 Suppr.
            </Button>
          </Stack>
        </TableCell>
      </TableRow>
    );
  }

  function PropertiesTable({ rows }) {
    return (
      <Paper sx={{ overflowX: "auto", mb: groupBy ? 2 : 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Annonce</TableCell>
              {(!groupBy || groupBy !== "type")    && <TableCell>Type</TableCell>}
              {(!groupBy || groupBy !== "owner")   && <TableCell>Annonceur</TableCell>}
              {(!groupBy || groupBy !== "country_code") && <TableCell>Pays</TableCell>}
              <TableCell>Ville</TableCell>
              <TableCell align="right">Prix</TableCell>
              {(!groupBy || groupBy !== "subscription_status") && <TableCell>Statut</TableCell>}
              <TableCell align="right">Jours restants</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((p) => <PropertyRow key={p.id} p={p} />)}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ color: "text.secondary", py: 3 }}>
                  Aucune annonce
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    );
  }

  if (authorized === null) return (
    <AdminLayout title="Annonces — Admin"><Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box></AdminLayout>
  );
  if (authorized === false) return (
    <AdminLayout title="Annonces — Admin">
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Accès refusé</Typography>
      </Paper>
    </AdminLayout>
  );

  const expiringCount  = properties.filter((p) => p.subscription_status === "expiring_soon").length;
  const expiredCount   = properties.filter((p) => p.subscription_status === "expired").length;
  const suspendedCount = properties.filter((p) => p.status === "suspended").length;

  return (
    <AdminLayout title="Annonces — Admin">
      {/* En-tête */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4">
          Annonces ({filtered.length}{filtered.length !== properties.length ? `/${properties.length}` : ""})
        </Typography>
        <Button onClick={() => router.push("/admin")} variant="outlined">Retour au tableau de bord</Button>
      </Box>

      {(expiringCount > 0 || expiredCount > 0 || suspendedCount > 0) && (
        <Alert severity={expiredCount > 0 || suspendedCount > 0 ? "error" : "warning"} sx={{ mb: 2 }}>
          {expiredCount  > 0 && `${expiredCount} annonce(s) expirée(s). `}
          {suspendedCount > 0 && `${suspendedCount} annonce(s) suspendue(s). `}
          {expiringCount > 0 && `${expiringCount} annonce(s) expire(nt) dans moins de 7 jours.`}
        </Alert>
      )}

      {actionMsg && <Alert severity={actionMsg.severity} onClose={() => setActionMsg(null)} sx={{ mb: 2 }}>{actionMsg.text}</Alert>}
      {error     && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Barre de filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Type"
              value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <MenuItem value="">Tous les types</MenuItem>
              {uniqueTypes.map((t) => <MenuItem key={t} value={t}>{TYPE_LABELS[t] || t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Pays"
              value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}>
              <MenuItem value="">Tous les pays</MenuItem>
              {uniqueCountries.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Annonceur"
              value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
              <MenuItem value="">Tous les annonceurs</MenuItem>
              {uniqueOwners.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Statut"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">Tous les statuts</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="expiring_soon">Expire bientôt</MenuItem>
              <MenuItem value="expired">Expirée</MenuItem>
              <MenuItem value="no_subscription">Sans abonnement</MenuItem>
              <MenuItem value="suspended">Suspendue</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Jours restants"
              value={filterDays} onChange={(e) => setFilterDays(e.target.value)}>
              {Object.entries(DAYS_FILTER_LABEL).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField select fullWidth size="small" label="Grouper par"
              value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
              <MenuItem value="">Sans regroupement</MenuItem>
              <MenuItem value="type">Type</MenuItem>
              <MenuItem value="owner">Annonceur</MenuItem>
              <MenuItem value="country_code">Pays</MenuItem>
              <MenuItem value="subscription_status">Statut</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        {anyFilter && (
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Button size="small" variant="text" onClick={resetFilters}>✕ Réinitialiser</Button>
            <Typography variant="caption" color="text.secondary">
              {filtered.length} / {properties.length} annonce(s)
            </Typography>
          </Box>
        )}
      </Paper>

      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

      {/* Table(s) — avec ou sans groupement */}
      {!loading && (
        groupBy
          ? grouped.map(([label, rows]) => (
              <Box key={label}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, mb: 0.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
                  <Chip label={rows.length} size="small" color="primary" />
                </Box>
                <PropertiesTable rows={rows} />
              </Box>
            ))
          : <PropertiesTable rows={filtered} />
      )}

      {/* Dialog — Prolonger */}
      <Dialog open={extendDialog.open} onClose={() => setExtendDialog((d) => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>⏱ Prolonger l&apos;annonce</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}><strong>{extendDialog.prop?.title}</strong></Typography>
          <TextField label="Jours à ajouter" type="number" inputProps={{ min: 1, max: 365 }}
            value={extendDialog.days} onChange={(e) => setExtendDialog((d) => ({ ...d, days: e.target.value }))}
            fullWidth sx={{ mb: 2 }} />
          <TextField label="Note interne (optionnelle)" value={extendDialog.note}
            onChange={(e) => setExtendDialog((d) => ({ ...d, note: e.target.value }))}
            fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtendDialog((d) => ({ ...d, open: false }))}>Annuler</Button>
          <Button onClick={handleExtend} variant="contained" disabled={!extendDialog.days || Number(extendDialog.days) < 1}>Prolonger</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog — Suspendre */}
      <Dialog open={suspendDialog.open} onClose={() => setSuspendDialog((d) => ({ ...d, open: false }))} maxWidth="xs" fullWidth>
        <DialogTitle>⏸ Suspendre l&apos;annonce</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            L&apos;annonce <strong>{suspendDialog.prop?.title}</strong> sera masquée des visiteurs.
          </Typography>
          <TextField label="Motif (envoyé à l'annonceur)" value={suspendDialog.note}
            onChange={(e) => setSuspendDialog((d) => ({ ...d, note: e.target.value }))}
            fullWidth multiline rows={3} placeholder="Ex : Photos manquantes, contenu non conforme…" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSuspendDialog((d) => ({ ...d, open: false }))}>Annuler</Button>
          <Button onClick={handleSuspend} variant="contained" color="warning">Suspendre</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
