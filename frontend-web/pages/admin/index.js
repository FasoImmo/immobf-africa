import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button, CircularProgress } from "@mui/material";
import Layout from "../../components/Layout";
import { Properties, Payments } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

export default function AdminDashboard() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [tx, setTx] = useState([]);
  // null = vérification en cours, false = accès refusé, true = autorisé
  const [authorized, setAuthorized] = useState(null);

  // ─── Garde d'accès : rôle "admin" obligatoire ────────────────────────────
  // Avant ce correctif, n'importe quel utilisateur connecté (acheteur,
  // vendeur...) pouvait ouvrir /admin directement via l'URL.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("immobf_token");
    if (!token) {
      router.replace("/login?redirect=/admin");
      return;
    }
    let user = null;
    try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
    if (!user || user.role !== "admin") {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (authorized !== true) return;
    Properties.search({ limit: 50 }).then((d) => setItems(d.items || []));
    Payments.list().then((d) => setTx(d.items || [])).catch(() => setTx([]));
  }, [authorized]);

  if (authorized === null) {
    return (
      <Layout title="Admin — ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </Layout>
    );
  }

  if (authorized === false) {
    return (
      <Layout title="Admin — ImmoBF">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5" gutterBottom>Accès refusé</Typography>
          <Typography color="text.secondary">
            Cette page est réservée aux administrateurs du site.
          </Typography>
        </Paper>
      </Layout>
    );
  }

  const countByCity = items.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1; return acc;
  }, {});
  const totalValue = items.reduce((s, p) => s + Number(p.price || 0), 0);

  function exportCsv() {
    const rows = [["id","title","city","type","price","currency","status"]]
      .concat(items.map((p) => [p.id, p.title, p.city, p.type, p.price, p.currency, p.status]));
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "annonces.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Admin — ImmoBF">
      <Typography variant="h4" gutterBottom>Tableau de bord</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}><Typography variant="overline">Annonces</Typography>
            <Typography variant="h4">{items.length}</Typography></Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}><Typography variant="overline">Valeur catalogue</Typography>
            <Typography variant="h5">{formatFCFA(totalValue)}</Typography></Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2 }}><Typography variant="overline">Transactions (user)</Typography>
            <Typography variant="h4">{tx.length}</Typography></Paper>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={() => router.push("/admin/users")}>
          Gérer les abonnés
        </Button>
        <Button variant="contained" onClick={() => router.push("/admin/properties")}>
          Délais de publication
        </Button>
      </Box>

      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Par ville</Typography>
        <Button onClick={exportCsv} variant="outlined">Exporter CSV</Button>
      </Box>

      <Paper>
        <Table size="small">
          <TableHead><TableRow><TableCell>Ville</TableCell><TableCell align="right">Annonces</TableCell></TableRow></TableHead>
          <TableBody>
            {Object.entries(countByCity).sort((a,b) => b[1]-a[1]).map(([c,n]) => (
              <TableRow key={c}><TableCell>{c}</TableCell><TableCell align="right">{n}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Layout>
  );
}
