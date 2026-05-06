import { useEffect, useState } from "react";
import { Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Button } from "@mui/material";
import Layout from "../../components/Layout";
import { Properties, Payments } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

export default function AdminDashboard() {
  const [items, setItems] = useState([]);
  const [tx, setTx] = useState([]);

  useEffect(() => {
    Properties.search({ limit: 50 }).then((d) => setItems(d.items || []));
    Payments.list().then((d) => setTx(d.items || [])).catch(() => setTx([]));
  }, []);

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
