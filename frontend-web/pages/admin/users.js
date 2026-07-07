import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, CircularProgress, Chip, Alert, Snackbar, Grid, TextField, MenuItem,
} from "@mui/material";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";

const ROLE_LABELS = { buyer: "Client", seller: "Vendeur", agent: "Agent", admin: "Admin" };

export default function AdminUsers() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [toast, setToast]           = useState(null);
  const [actingId, setActingId]     = useState(null);

  // Filtres
  const [filterName,   setFilterName]   = useState("");
  const [filterRole,   setFilterRole]   = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) { router.replace("/login?redirect=/admin/users"); return; }
    let user = null;
    try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!user || user.role !== "admin") { setAuthorized(false); return; }
    setAuthorized(true);
  }, []); // eslint-disable-line

  function load() {
    setLoading(true); setError(null);
    Admin.users({ limit: 500 })
      .then((d) => setUsers(d.users || []))
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (authorized === true) load(); }, [authorized]); // eslint-disable-line

  // Filtrage client
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterName) {
        const q = filterName.toLowerCase();
        const name  = (u.full_name || "").toLowerCase();
        const phone = (u.phone     || "").toLowerCase();
        const email = (u.email     || "").toLowerCase();
        if (!name.includes(q) && !phone.includes(q) && !email.includes(q)) return false;
      }
      if (filterRole   && u.role !== filterRole) return false;
      if (filterStatus === "active"  &&  u.is_blocked) return false;
      if (filterStatus === "blocked" && !u.is_blocked) return false;
      return true;
    });
  }, [users, filterName, filterRole, filterStatus]);

  const anyFilter = filterName || filterRole || filterStatus;
  function resetFilters() { setFilterName(""); setFilterRole(""); setFilterStatus(""); }

  async function handleBlock(u, blocked) {
    setActingId(u.id);
    try {
      await Admin.setUserBlocked(u.id, blocked);
      setToast(blocked ? `${u.full_name || u.phone} bloqué.` : `${u.full_name || u.phone} débloqué.`);
      load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  async function handleLogout(u) {
    setActingId(u.id);
    try {
      await Admin.logoutUser(u.id);
      setToast(`Session de ${u.full_name || u.phone} invalidée.`);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  async function handleDelete(u) {
    if (!window.confirm(`Supprimer définitivement le compte de "${u.full_name || u.phone}" ? Action irréversible.`)) return;
    setActingId(u.id);
    try {
      await Admin.deleteUser(u.id);
      setToast(`Compte de ${u.full_name || u.phone} supprimé.`);
      load();
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  if (authorized === null) return (
    <AdminLayout title="Abonnés — Admin"><Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box></AdminLayout>
  );
  if (authorized === false) return (
    <AdminLayout title="Abonnés — Admin">
      <Paper sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Accès refusé</Typography>
        <Typography color="text.secondary">Réservé aux administrateurs.</Typography>
      </Paper>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Abonnés — Admin">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4">
          Abonnés ({filtered.length}{filtered.length !== users.length ? `/${users.length}` : ""})
        </Typography>
        <Button onClick={() => router.push("/admin")} variant="outlined">Retour au tableau de bord</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Barre de filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 2 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              fullWidth size="small" label="Rechercher par nom / téléphone / email"
              value={filterName} onChange={(e) => setFilterName(e.target.value)}
              placeholder="ex: Kosmad, +226…"
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField select fullWidth size="small" label="Rôle"
              value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <MenuItem value="">Tous les rôles</MenuItem>
              <MenuItem value="buyer">Client</MenuItem>
              <MenuItem value="seller">Vendeur</MenuItem>
              <MenuItem value="agent">Agent</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <TextField select fullWidth size="small" label="Statut"
              value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="active">Actif</MenuItem>
              <MenuItem value="blocked">Bloqué</MenuItem>
            </TextField>
          </Grid>
          {anyFilter && (
            <Grid item xs={12} sm="auto">
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button size="small" variant="text" onClick={resetFilters}>✕ Réinitialiser</Button>
                <Typography variant="caption" color="text.secondary">
                  {filtered.length} / {users.length} abonné(s)
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

      {!loading && (
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nom</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Annonces</TableCell>
                <TableCell>Inscrit le</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.phone}{u.email ? ` / ${u.email}` : ""}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={ROLE_LABELS[u.role] || u.role}
                      size="small"
                      color={u.role === "admin" ? "primary" : u.role === "seller" ? "secondary" : "default"}
                      variant={u.role === "admin" ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>{u.properties_count}</TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell>
                    {u.is_blocked
                      ? <Chip label="Bloqué" color="error" size="small" />
                      : <Chip label="Actif" color="success" size="small" variant="outlined" />}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => router.push(`/admin/users/${u.id}`)}>
                      📊 Stats
                    </Button>
                    <Button size="small" disabled={actingId === u.id}
                      onClick={() => handleBlock(u, !u.is_blocked)}
                      color={u.is_blocked ? "success" : "error"}>
                      {u.is_blocked ? "Débloquer" : "Bloquer"}
                    </Button>
                    <Button size="small" disabled={actingId === u.id} onClick={() => handleLogout(u)}>
                      Déconnecter
                    </Button>
                    <Button size="small" color="error" disabled={actingId === u.id} onClick={() => handleDelete(u)}>
                      🗑 Supprimer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ color: "text.secondary", py: 3 }}>
                    Aucun abonné correspondant aux filtres
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </AdminLayout>
  );
}
