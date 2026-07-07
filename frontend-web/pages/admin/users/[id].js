import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Typography, Button, Paper, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, CircularProgress, Alert, Divider, Grid,
} from "@mui/material";
import AdminLayout from "../../../components/AdminLayout";
import { Admin } from "../../../lib/api";
import { formatFCFA } from "../../../lib/format";

const STATUS_COLOR = { succeeded: "success", pending: "warning", failed: "error" };
const PURPOSE_LABEL = { listing: "Publication", commission: "Commission", deposit: "Acompte" };

export default function AdminUserStats() {
  const router = useRouter();
  const { id } = router.query;
  const [authorized, setAuthorized] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) { router.replace("/login?redirect=/admin/users"); return; }
    let user = null;
    try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!user || user.role !== "admin") { setAuthorized(false); return; }
    setAuthorized(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!id || authorized !== true) return;
    setLoading(true);
    Admin.userStats(id)
      .then(setData)
      .catch((e) => setError(e?.response?.data?.error?.message || e.message))
      .finally(() => setLoading(false));
  }, [id, authorized]);

  if (authorized === null || loading) {
    return <AdminLayout title="Stats annonceur — Admin"><Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box></AdminLayout>;
  }
  if (authorized === false) {
    return <AdminLayout title="Stats annonceur — Admin"><Alert severity="error">Accès réservé aux administrateurs.</Alert></AdminLayout>;
  }

  const u = data?.user;
  const transactions = data?.transactions || [];
  const interactions = data?.interactions || [];

  const totalPaid = transactions
    .filter((t) => t.status === "succeeded")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <AdminLayout title={`Stats — ${u?.full_name || u?.phone || "..."} — Admin`}>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 3 }}>
        <Button variant="outlined" onClick={() => router.push("/admin/users")}>← Abonnés</Button>
        <Typography variant="h5" fontWeight={700}>
          📊 Stats : {u?.full_name || u?.phone || "..."}
        </Typography>
        {u?.is_blocked && <Chip label="Bloqué" color="error" size="small" />}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {u && (
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Nom</Typography>
              <Typography fontWeight={600}>{u.full_name || "—"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Contact</Typography>
              <Typography>{u.phone}{u.email ? ` / ${u.email}` : ""}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">Rôle / Pays</Typography>
              <Typography>{u.role} {u.country_code ? `· ${u.country_code}` : ""}</Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="caption" color="text.secondary">CA versé à ImmoBF</Typography>
              <Typography fontWeight={700} color="success.main">{formatFCFA(totalPaid)}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Transactions ─────────────────────────────────────────────────── */}
      <Typography variant="h6" gutterBottom>Transactions ({transactions.length})</Typography>
      <Paper elevation={0} sx={{ mb: 4, overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Référence</TableCell>
              <TableCell>Annonce</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Montant</TableCell>
              <TableCell>Provider</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 && (
              <TableRow><TableCell colSpan={7} sx={{ textAlign: "center", color: "text.secondary" }}>Aucune transaction</TableCell></TableRow>
            )}
            {transactions.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "—"}</TableCell>
                <TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{t.reference}</TableCell>
                <TableCell sx={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.property_title || "—"}
                </TableCell>
                <TableCell>{PURPOSE_LABEL[t.purpose] || t.purpose}</TableCell>
                <TableCell>{formatFCFA(t.amount, t.currency)}</TableCell>
                <TableCell>{t.provider}</TableCell>
                <TableCell>
                  <Chip
                    label={t.status}
                    color={STATUS_COLOR[t.status] || "default"}
                    size="small"
                    variant={t.status === "succeeded" ? "filled" : "outlined"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Interactions sur les annonces ────────────────────────────────── */}
      <Typography variant="h6" gutterBottom>Annonces & interactions ({interactions.length})</Typography>
      <Paper elevation={0} sx={{ overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Annonce</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Pays / Ville</TableCell>
              <TableCell align="right">Vues</TableCell>
              <TableCell align="right">Clics WhatsApp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {interactions.length === 0 && (
              <TableRow><TableCell colSpan={5} sx={{ textAlign: "center", color: "text.secondary" }}>Aucune annonce</TableCell></TableRow>
            )}
            {interactions.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Button
                    size="small" variant="text"
                    onClick={() => window.open(`/properties/${p.id}`, "_blank")}
                    sx={{ textAlign: "left", textTransform: "none", p: 0 }}
                  >
                    {p.title}
                  </Button>
                </TableCell>
                <TableCell>
                  <Chip
                    label={p.status}
                    color={p.status === "active" ? "success" : "default"}
                    size="small" variant="outlined"
                  />
                </TableCell>
                <TableCell>{[p.country_code, p.city].filter(Boolean).join(" · ") || "—"}</TableCell>
                <TableCell align="right">{p.total_views}</TableCell>
                <TableCell align="right">{p.whatsapp_clicks}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </AdminLayout>
  );
}
