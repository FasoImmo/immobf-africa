import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody,
  Button, CircularProgress, Chip, Alert,
} from "@mui/material";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

// Vue admin-wide des délais de publication : avant ce correctif, le calcul
// de subscription_status / days_remaining existait déjà côté backend
// (Property.listForOwner) mais uniquement pour le propriétaire connecté —
// l'admin n'avait aucune visibilité d'ensemble sur les annonces arrivant à
// expiration sur toute la plateforme.
const STATUS_META = {
  active: { label: "Active", color: "success" },
  expiring_soon: { label: "Expire bientôt", color: "warning" },
  expired: { label: "Expirée", color: "error" },
  no_subscription: { label: "Sans abonnement", color: "default" },
};

export default function AdminProperties() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actingId, setActingId] = useState(null);

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
  const expiredCount = properties.filter((p) => p.subscription_status === "expired").length;

  return (
    <Layout title="Délais de publication — Admin">
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h4">Annonces ({properties.length})</Typography>
        <Button onClick={() => router.push("/admin")} variant="outlined">Retour au tableau de bord</Button>
      </Box>

      {(expiringCount > 0 || expiredCount > 0) && (
        <Alert severity={expiredCount > 0 ? "error" : "warning"} sx={{ mb: 2 }}>
          {expiredCount > 0 && `${expiredCount} annonce(s) expirée(s). `}
          {expiringCount > 0 && `${expiringCount} annonce(s) expire(nt) dans moins de 7 jours.`}
        </Alert>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress /></Box>}

      {!loading && (
        <Paper>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Annonce</TableCell>
                <TableCell>Propriétaire</TableCell>
                <TableCell>Ville</TableCell>
                <TableCell align="right">Prix</TableCell>
                <TableCell>Statut abonnement</TableCell>
                <TableCell align="right">Jours restants</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {properties.map((p) => {
                const meta = STATUS_META[p.subscription_status] || STATUS_META.no_subscription;
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>{p.owner_name || "—"}{p.owner_phone ? ` (${p.owner_phone})` : ""}</TableCell>
                    <TableCell>{p.city}</TableCell>
                    <TableCell align="right">{formatFCFA(p.price)}</TableCell>
                    <TableCell><Chip label={meta.label} color={meta.color} size="small" /></TableCell>
                    <TableCell align="right">
                      {p.days_remaining != null ? p.days_remaining : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small" color="error" variant="outlined"
                        disabled={actingId === p.id}
                        onClick={() => handleDelete(p)}
                      >
                        🗑 Supprimer
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Layout>
  );
}
