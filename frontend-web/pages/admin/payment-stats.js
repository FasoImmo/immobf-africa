"use client";
import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";
import {
  Box, Typography, Alert, CircularProgress, TextField, Button,
  MenuItem, Select, FormControl, InputLabel, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Paper, Chip, Divider, Grid,
} from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import FilterListIcon from "@mui/icons-material/FilterList";

// ─── Labels opérateurs/modes de paiement ──────────────────────────────────────
const OPERATOR_LABELS = {
  orange:       { label: "Orange Money",   color: "#F97316" },
  moov:         { label: "Moov Money",     color: "#3B82F6" },
  wave:         { label: "Wave",           color: "#06B6D4" },
  mtn:          { label: "MTN Mobile Money", color: "#EAB308" },
  card:         { label: "Carte bancaire", color: "#6366F1" },
  airtel:       { label: "Airtel Money",   color: "#EF4444" },
  vodacom:      { label: "Vodacom M-Pesa", color: "#10B981" },
  mpesa:        { label: "M-Pesa",         color: "#10B981" },
  free:         { label: "Free Money",     color: "#8B5CF6" },
  togocel:      { label: "T-Money",        color: "#F59E0B" },
  ecocash:      { label: "EcoCash",        color: "#22C55E" },
  airtel_tigo:  { label: "Airtel-Tigo",    color: "#EC4899" },
  unknown:      { label: "Non renseigné",  color: "#94A3B8" },
};

const PROVIDER_LABELS = {
  fedapay:         "FedaPay",
  pawapay:         "PawaPay",
  orange_money_bf: "Orange Money BF",
  moov_money_bf:   "Moov Money BF",
  wave:            "Wave",
  cinetpay:        "CinetPay",
  flutterwave:     "Flutterwave",
  paydunya:        "PayDunya",
};

function fmt(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

function OperatorChip({ op }) {
  const meta = OPERATOR_LABELS[op] || OPERATOR_LABELS.unknown;
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        bgcolor: meta.color + "22",
        color: meta.color,
        fontWeight: 600,
        fontSize: 12,
        border: `1px solid ${meta.color}44`,
      }}
    />
  );
}

// Regroupe les lignes par provider, chaque provider ayant une liste d'opérateurs
function groupByProvider(rows) {
  const map = {};
  for (const row of rows) {
    if (!map[row.provider]) map[row.provider] = { rows: [], total_revenue: 0, nb_succeeded: 0 };
    map[row.provider].rows.push(row);
    map[row.provider].total_revenue += Number(row.total_revenue || 0);
    map[row.provider].nb_succeeded  += Number(row.nb_succeeded  || 0);
  }
  // Tri par revenue décroissant
  return Object.entries(map).sort((a, b) => b[1].total_revenue - a[1].total_revenue);
}

export default function PaymentStatsPage() {
  const [rows,     setRows]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);

  // Filtres
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10);

  const [start,    setStart]    = useState(firstOfMonth);
  const [end,      setEnd]      = useState(today);
  const [provider, setProvider] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (start)    params.start    = start;
      if (end)      params.end      = end;
      if (provider) params.provider = provider;
      const data = await Admin.paymentStatsByMode(params);
      setRows(data.rows || []);
    } catch (e) {
      setError(e.response?.data?.error?.message || e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [start, end, provider]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  const grouped = rows ? groupByProvider(rows) : [];

  // Totaux globaux
  const grandTotal = rows
    ? rows.reduce((acc, r) => ({
        revenue: acc.revenue + Number(r.total_revenue || 0),
        succeeded: acc.succeeded + Number(r.nb_succeeded || 0),
        failed:    acc.failed    + Number(r.nb_failed    || 0),
        pending:   acc.pending   + Number(r.nb_pending   || 0),
        total:     acc.total     + Number(r.nb_total     || 0),
      }), { revenue: 0, succeeded: 0, failed: 0, pending: 0, total: 0 })
    : null;

  return (
    <AdminLayout title="Stats paiements — ImmoBF Africa">
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>

        {/* ── En-tête ─────────────────────────────────────────── */}
        <Typography variant="h5" fontWeight={700} color="#0F172A" sx={{ mb: 0.5 }}>
          Stats paiements par mode
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3, fontSize: 14 }}>
          Détail des paiements reçus par fournisseur et mode de paiement (Orange Money, Moov, Wave, carte…) sur la période choisie.
        </Typography>

        {/* ── Filtres ─────────────────────────────────────────── */}
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2, border: "1px solid #E2E8F0" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="flex-end" flexWrap="wrap">
            <TextField
              label="Du"
              type="date"
              size="small"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="Au"
              type="date"
              size="small"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Fournisseur</InputLabel>
              <Select
                value={provider}
                label="Fournisseur"
                onChange={(e) => setProvider(e.target.value)}
              >
                <MenuItem value="">Tous</MenuItem>
                {Object.entries(PROVIDER_LABELS).map(([id, label]) => (
                  <MenuItem key={id} value={id}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              onClick={load}
              disabled={loading}
              sx={{
                bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0a6355" },
                fontWeight: 600, px: 3, height: 40,
              }}
            >
              Filtrer
            </Button>
          </Stack>
        </Paper>

        {/* ── Chargement / erreur ──────────────────────────────── */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#0E7C66" }} />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ── KPIs globaux ──────────────────────────────────────── */}
        {!loading && grandTotal && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              { label: "CA total (FCFA)",   value: fmt(grandTotal.revenue),   color: "#0E7C66" },
              { label: "Réussies",          value: fmt(grandTotal.succeeded),  color: "#22C55E" },
              { label: "Échouées",          value: fmt(grandTotal.failed),     color: "#EF4444" },
              { label: "En attente",        value: fmt(grandTotal.pending),    color: "#F59E0B" },
              { label: "Total transactions",value: fmt(grandTotal.total),      color: "#6366F1" },
            ].map((kpi) => (
              <Grid item xs={6} sm={4} md={2.4} key={kpi.label}>
                <Paper
                  sx={{
                    p: 2, borderRadius: 2, textAlign: "center",
                    border: `1px solid ${kpi.color}33`,
                    bgcolor: kpi.color + "0D",
                  }}
                >
                  <Typography sx={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>
                    {kpi.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}

        {/* ── Tableau détaillé par provider ────────────────────── */}
        {!loading && rows !== null && rows.length === 0 && (
          <Box sx={{ textAlign: "center", py: 8, color: "#94A3B8" }}>
            <SearchOffIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>Aucune transaction sur la période sélectionnée.</Typography>
          </Box>
        )}

        {!loading && grouped.length > 0 && grouped.map(([provId, group]) => (
          <Paper key={provId} sx={{ mb: 3, borderRadius: 2, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            {/* En-tête provider */}
            <Box
              sx={{
                px: 3, py: 1.5,
                bgcolor: "#0F172A",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                {PROVIDER_LABELS[provId] || provId}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Typography sx={{ color: "#94A3B8", fontSize: 13 }}>
                  <b style={{ color: "#4ADE80" }}>{fmt(group.nb_succeeded)}</b> réussies
                </Typography>
                <Typography sx={{ color: "#94A3B8", fontSize: 13 }}>
                  CA : <b style={{ color: "#4ADE80" }}>{fmt(group.total_revenue)} FCFA</b>
                </Typography>
              </Stack>
            </Box>

            {/* Tableau opérateurs */}
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["Mode de paiement", "Réussies", "Échouées", "En attente", "Total", "CA (FCFA)"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 600, fontSize: 12, color: "#64748B" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {group.rows.map((row, i) => (
                    <TableRow
                      key={i}
                      sx={{ "&:hover": { bgcolor: "#F1F5F9" }, "&:last-child td": { border: 0 } }}
                    >
                      <TableCell>
                        <OperatorChip op={row.operator} />
                      </TableCell>
                      <TableCell sx={{ color: "#22C55E", fontWeight: 600 }}>
                        {fmt(row.nb_succeeded)}
                      </TableCell>
                      <TableCell sx={{ color: row.nb_failed > 0 ? "#EF4444" : "#94A3B8" }}>
                        {fmt(row.nb_failed)}
                      </TableCell>
                      <TableCell sx={{ color: "#F59E0B" }}>
                        {fmt(row.nb_pending)}
                      </TableCell>
                      <TableCell>{fmt(row.nb_total)}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: "#0E7C66" }}>
                        {fmt(row.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Ligne total provider */}
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: 13 }}>Total {PROVIDER_LABELS[provId] || provId}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#22C55E" }}>
                      {fmt(group.rows.reduce((s, r) => s + Number(r.nb_succeeded), 0))}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#EF4444" }}>
                      {fmt(group.rows.reduce((s, r) => s + Number(r.nb_failed), 0))}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#F59E0B" }}>
                      {fmt(group.rows.reduce((s, r) => s + Number(r.nb_pending), 0))}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      {fmt(group.rows.reduce((s, r) => s + Number(r.nb_total), 0))}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#0E7C66" }}>
                      {fmt(group.total_revenue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ))}

      </Box>
    </AdminLayout>
  );
}
