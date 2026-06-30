import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, CircularProgress, Chip, TextField, InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import Layout from "../../components/Layout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

// Page dédiée au suivi des annonceurs : par pays, montant total payé à
// ImmoBF (fidélité), nombre d'annonces publiées, et date de dernière
// activité. Chaque ligne représente un utilisateur ayant au moins une
// transaction ou une annonce.

function badge(n) {
  if (n >= 5) return { label: "Fidèle ⭐", color: "success" };
  if (n >= 2) return { label: "Régulier", color: "primary" };
  return { label: "Nouveau", color: "default" };
}

function accessGuard(router, setAuthorized) {
  if (typeof window === "undefined") return;
  const token = localStorage.getItem("immobf_token");
  if (!token) { router.replace("/login?redirect=/admin/revenues"); return; }
  let user = null;
  try { user = JSON.parse(localStorage.getItem("immobf_user") || "null"); } catch (_) {}
  if (!user || user.role !== "admin") { setAuthorized(false); return; }
  setAuthorized(true);
}

export default function AdminRevenues() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);
  const [annonceurs, setAnnonceurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  useEffect(() => { accessGuard(router, setAuthorized); }, []); // eslint-disable-line

  useEffect(() => {
    if (authorized !== true) return;
    setLoading(true);
    Admin.revenues()
      .then((d) => setAnnonceurs(d.annonceurs || []))
      .finally(() => setLoading(false));
  }, [authorized]);

  if (authorized === null) {
    return (
      <Layout title="Revenus par annonceur — Admin ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </Layout>
    );
  }
  if (authorized === false) {
    return (
      <Layout title="Revenus — Admin ImmoBF">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5">Accès refusé</Typography>
        </Paper>
      </Layout>
    );
  }

  // Pays disponibles dans la liste pour le filtre
  const countries = [...new Set(annonceurs.map((a) => a.main_country).filter(Boolean))].sort();

  const filtered = annonceurs.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (a.full_name || "").toLowerCase().includes(q) ||
      (a.phone || "").includes(q) ||
      (a.email || "").toLowerCase().includes(q);
    const matchCountry = !filterCountry || a.main_country === filterCountry;
    return matchSearch && matchCountry;
  });

  const totalRevenue = filtered.reduce((s, a) => s + Number(a.total_paid || 0), 0);

  function exportCsv() {
    const rows = [["nom","email","telephone","pays_principal","nb_annonces","nb_transactions","total_paye_xof","fidelite","dernier_paiement"]]
      .concat(filtered.map((a) => [
        a.full_name || "", a.email || "", a.phone || "",
        a.main_country || "", a.nb_annonces, a.nb_transactions, a.total_paid,
        badge(Number(a.nb_transactions)).label,
        a.last_payment_at ? new Date(a.last_payment_at).toLocaleDateString("fr-FR") : "",
      ]));
    const csv = rows.map((r) => r.map((v) => `"${(v ?? "").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "revenus-annonceurs.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout title="Revenus par annonceur — Admin ImmoBF">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button variant="text" onClick={() => router.push("/admin")}>← Tableau de bord</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Revenus par annonceur
        </Typography>
        <Button variant="outlined" size="small" onClick={exportCsv}>Exporter CSV</Button>
      </Box>

      {/* Filtres */}
      <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small" placeholder="Nom, téléphone, email…"
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220 }}
        />
        <TextField
          select size="small" label="Pays" value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          SelectProps={{ native: true }} sx={{ minWidth: 140 }}
        >
          <option value="">Tous les pays</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </TextField>
        <Typography variant="body2" sx={{ alignSelf: "center", color: "text.secondary" }}>
          {filtered.length} annonceur(s) · CA filtré : <strong>{formatFCFA(totalRevenue)}</strong>
        </Typography>
      </Box>

      {loading && <CircularProgress size={20} sx={{ mb: 2 }} />}

      <Paper sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 700, background: "#f5f5f5" } }}>
              <TableCell>Annonceur</TableCell>
              <TableCell>Pays principal</TableCell>
              <TableCell align="right">Annonces</TableCell>
              <TableCell align="right">Transactions</TableCell>
              <TableCell align="right">Total payé à ImmoBF</TableCell>
              <TableCell>Fidélité</TableCell>
              <TableCell>Dernière activité</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((a) => {
              const b = badge(Number(a.nb_transactions));
              return (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{a.full_name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {a.phone}
                    </Typography>
                    {a.email && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {a.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{a.main_country || "—"}</Typography>
                  </TableCell>
                  <TableCell align="right">{a.nb_annonces}</TableCell>
                  <TableCell align="right">{a.nb_transactions}</TableCell>
                  <TableCell align="right">
                    <Typography
                      variant="body2" fontWeight={700}
                      color={Number(a.total_paid) > 0 ? "#1B6B3A" : "text.secondary"}
                    >
                      {formatFCFA(a.total_paid)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={b.label} color={b.color} size="small" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {a.last_payment_at
                        ? new Date(a.last_payment_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Aucun annonceur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Légende fidélité */}
      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">Fidélité :</Typography>
        <Chip label="Nouveau (1 tx)" color="default" size="small" />
        <Chip label="Régulier (2–4 tx)" color="primary" size="small" />
        <Chip label="Fidèle ⭐ (5+ tx)" color="success" size="small" />
      </Box>
    </Layout>
  );
}
