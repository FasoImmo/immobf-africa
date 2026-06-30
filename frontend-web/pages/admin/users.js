import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, CircularProgress, Chip, Alert, Snackbar,
} from "@mui/material";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";

// Vraie page de gestion des abonnés : liste tous les utilisateurs inscrits
// (pas seulement les statistiques globales), avec possibilité de bloquer,
// débloquer, ou forcer la déconnexion d'un compte. Avant ce correctif,
// l'admin n'avait aucun moyen de voir qui est inscrit ni d'agir sur un compte.
export default function AdminUsers() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [actingId, setActingId] = useState(null);

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
    Admin.users({ limit: 200 })
      .then((d) => setUsers(d.users || []))
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (authorized === true) load(); }, [authorized]);

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
      setToast(`Session de ${u.full_name || u.phone} invalidée — reconnexion requise.`);
    } catch (e) {
      setError(e?.response?.data?.error?.message || e.message);
    } finally { setActingId(null); }
  }

  if (authorized === null) {
    return (
      <Layout title="Abonnés — Admin"><Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box></Layout>
    );
  }
  if (authorized === false) {
    return (
      <Layout title="Abonnés — Admin">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>Accès refusé</Typography>
          <Typography color="text.secondary">Cette page est réservée aux administrateurs du site.</Typography>
        </Paper>
      </Layout>
    );
  }

  const roleLabels = { buyer: "Acheteur", seller: "Vendeur", agent: "Agent", admin: "Admin" };

  return (
    <Layout title="Abonnés — Admin">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Abonnés ({users.length})</Typography>
        <Button onClick={() => router.push("/admin")} variant="outlined">Retour au tableau de bord</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

      {!loading && (
        <Paper>
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
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell>{u.phone}{u.email ? ` / ${u.email}` : ""}</TableCell>
                  <TableCell>{roleLabels[u.role] || u.role}</TableCell>
                  <TableCell>{u.properties_count}</TableCell>
                  <TableCell>{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                  <TableCell>
                    {u.is_blocked
                      ? <Chip label="Bloqué" color="error" size="small" />
                      : <Chip label="Actif" color="success" size="small" variant="outlined" />}
                  </TableCell>
                  <TableCell align="right">
                    <Button
                      size="small" disabled={actingId === u.id}
                      onClick={() => handleBlock(u, !u.is_blocked)}
                      color={u.is_blocked ? "success" : "error"}
                    >
                      {u.is_blocked ? "Débloquer" : "Bloquer"}
                    </Button>
                    <Button size="small" disabled={actingId === u.id} onClick={() => handleLogout(u)}>
                      Déconnecter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast} />
    </Layout>
  );
}
