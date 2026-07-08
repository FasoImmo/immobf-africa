import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box, Button, Chip, CircularProgress, Container, Grid,
  InputAdornment, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Typography, Tooltip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

// ─── constantes ────────────────────────────────────────────────────────────────
const PURPOSE_LABEL = {
  listing_fee: "Frais pub.",
  commission:  "Commission",
  deposit:     "Acompte",
  subscription:"Abonnement",
  boost:       "Boost",
  escrow:      "Séquestre",
};
const STATUS_COLOR = {
  succeeded: "success",
  pending:   "warning",
  failed:    "error",
  refunded:  "default",
  cancelled: "default",
};
const STATUS_LABEL = {
  succeeded: "Réussi",
  pending:   "En attente",
  failed:    "Échoué",
  refunded:  "Remboursé",
  cancelled: "Annulé",
};
const PROVIDERS = ["fedapay","pawapay","flutterwave","cinetpay","stripe","manual"];
const PAGE_SIZE = 50;

function guard(router, setOk) {
  if (typeof window === "undefined") return;
  const tok = localStorage.getItem("immobf_token");
  if (!tok) { router.replace("/login?redirect=/admin/transactions"); return; }
  try {
    const u = JSON.parse(localStorage.getItem("immobf_user") || "null");
    if (!u || u.role !== "admin") { setOk(false); return; }
  } catch (_) { setOk(false); return; }
  setOk(true);
}

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography variant="h6" fontWeight={700} color={color || "text.primary"} sx={{ mt: 0.5 }}>
        {value}
      </Typography>
    </Paper>
  );
}

// ─── composant principal ──────────────────────────────────────────────────────
export default function AdminTransactions() {
  const router = useRouter();
  const [ok, setOk]         = useState(null);
  const [rows, setRows]     = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage]     = useState(0);

  // filtres
  const [dateFrom,   setDateFrom]   = useState("");
  const [dateTo,     setDateTo]     = useState("");
  const [search,     setSearch]     = useState("");
  const [country,    setCountry]    = useState("");
  const [purpose,    setPurpose]    = useState("");
  const [provider,   setProvider]   = useState("");
  const [status,     setStatus]     = useState("");
  const [minAmount,  setMinAmount]  = useState("");
  const [maxAmount,  setMaxAmount]  = useState("");

  useEffect(() => { guard(router, setOk); }, []);

  const load = useCallback(async (p = 0) => {
    setLoading(true);
    try {
      const params = {
        limit:  PAGE_SIZE,
        offset: p * PAGE_SIZE,
      };
      if (dateFrom)  params.date_from  = dateFrom;
      if (dateTo)    params.date_to    = dateTo;
      if (search)    params.search     = search;
      if (country)   params.country    = country;
      if (purpose)   params.purpose    = purpose;
      if (provider)  params.provider   = provider;
      if (status)    params.status     = status;
      if (minAmount) params.min_amount = minAmount;
      if (maxAmount) params.max_amount = maxAmount;

      const data = await Admin.transactions(params);
      setRows(data.rows || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search, country, purpose, provider, status, minAmount, maxAmount]);

  useEffect(() => { if (ok) load(0); }, [ok]);

  // KPIs calculés depuis la page courante
  const succeeded = rows.filter(r => r.status === "succeeded");
  const totalSucceeded = succeeded.reduce((s, r) => s + Number(r.amount), 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (ok === null) return null;
  if (ok === false) return (
    <AdminLayout><Box sx={{ p: 4 }}><Typography color="error">Accès refusé.</Typography></Box></AdminLayout>
  );

  return (
    <AdminLayout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <Button variant="outlined" size="small" onClick={() => router.back()}>← Retour</Button>
          <Typography variant="h5" fontWeight={700}>💳 Transactions</Typography>
          <Typography variant="body2" color="text.secondary">
            {total} transaction{total !== 1 ? "s" : ""}
          </Typography>
        </Box>

        {/* ── Filtres ─────────────────────────────────────────────────── */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">

            {/* Recherche libre */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField fullWidth size="small" label="Annonceur / email / tél."
                value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && load(0)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />
            </Grid>

            {/* Date début */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth size="small" type="date" label="Du"
                value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Date fin */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth size="small" type="date" label="Au"
                value={dateTo} onChange={e => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Type */}
            <Grid item xs={6} sm={3} md={2}>
              <Select fullWidth size="small" displayEmpty value={purpose} onChange={e => setPurpose(e.target.value)}>
                <MenuItem value="">Tous types</MenuItem>
                {Object.entries(PURPOSE_LABEL).map(([k, v]) =>
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                )}
              </Select>
            </Grid>

            {/* Fournisseur */}
            <Grid item xs={6} sm={3} md={2}>
              <Select fullWidth size="small" displayEmpty value={provider} onChange={e => setProvider(e.target.value)}>
                <MenuItem value="">Tous fournisseurs</MenuItem>
                {PROVIDERS.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </Grid>

            {/* Statut */}
            <Grid item xs={6} sm={3} md={2}>
              <Select fullWidth size="small" displayEmpty value={status} onChange={e => setStatus(e.target.value)}>
                <MenuItem value="">Tous statuts</MenuItem>
                {Object.entries(STATUS_LABEL).map(([k, v]) =>
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                )}
              </Select>
            </Grid>

            {/* Pays */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth size="small" label="Pays (code ex: BF)"
                value={country} onChange={e => setCountry(e.target.value.toUpperCase())}
                inputProps={{ maxLength: 2 }}
              />
            </Grid>

            {/* Montant min */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth size="small" type="number" label="Montant min (FCFA)"
                value={minAmount} onChange={e => setMinAmount(e.target.value)}
              />
            </Grid>

            {/* Montant max */}
            <Grid item xs={6} sm={3} md={2}>
              <TextField fullWidth size="small" type="number" label="Montant max (FCFA)"
                value={maxAmount} onChange={e => setMaxAmount(e.target.value)}
              />
            </Grid>

            {/* Boutons */}
            <Grid item xs={12} sm={6} md={4} sx={{ display: "flex", gap: 1 }}>
              <Button variant="contained" onClick={() => load(0)} disabled={loading} sx={{ flexGrow: 1 }}>
                {loading ? <CircularProgress size={18} color="inherit" /> : "Filtrer"}
              </Button>
              <Button variant="outlined" onClick={() => {
                setDateFrom(""); setDateTo(""); setSearch(""); setCountry("");
                setPurpose(""); setProvider(""); setStatus(""); setMinAmount(""); setMaxAmount("");
                load(0);
              }}>
                Réinitialiser
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* ── KPIs ────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Total affiché" value={rows.length} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Total trouvé" value={total} />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Réussies (page)" value={succeeded.length} color="success.main" />
          </Grid>
          <Grid item xs={6} sm={3}>
            <KpiCard label="Montant réussi (page)" value={formatFCFA(totalSucceeded)} color="success.main" />
          </Grid>
        </Grid>

        {/* ── Tableau ─────────────────────────────────────────────────── */}
        <Paper sx={{ overflowX: "auto" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap", bgcolor: "grey.100" } }}>
                <TableCell>Date</TableCell>
                <TableCell>Annonceur</TableCell>
                <TableCell>Téléphone</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Pays</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Fournisseur</TableCell>
                <TableCell align="right">Montant</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Référence</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    Aucune transaction trouvée.
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.map(tx => {
                const email = tx.customer_email || tx.buyer_email || "—";
                const phone = tx.buyer_phone || "—";
                const name  = tx.buyer_name || "Invité";
                const date  = new Date(tx.created_at).toLocaleString("fr-FR", {
                  day: "2-digit", month: "2-digit", year: "2-digit",
                  hour: "2-digit", minute: "2-digit",
                });
                return (
                  <TableRow key={tx.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>{date}</TableCell>
                    <TableCell>
                      <Tooltip title={tx.property_title || ""} placement="top">
                        <Typography variant="body2" sx={{ maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>{phone}</TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Tooltip title={email}><span>{email}</span></Tooltip>
                    </TableCell>
                    <TableCell align="center">{tx.property_country || "—"}</TableCell>
                    <TableCell>
                      <Chip label={PURPOSE_LABEL[tx.purpose] || tx.purpose} size="small"
                        color={tx.purpose === "listing_fee" ? "primary" : "default"} variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{tx.provider}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {Number(tx.amount).toLocaleString("fr-FR")} {tx.currency}
                    </TableCell>
                    <TableCell>
                      <Chip label={STATUS_LABEL[tx.status] || tx.status}
                        color={STATUS_COLOR[tx.status] || "default"} size="small" />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11, color: "text.secondary", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <Tooltip title={tx.reference || ""}><span>{tx.reference || "—"}</span></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>

        {/* ── Pagination ──────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Button size="small" disabled={page === 0} onClick={() => load(page - 1)}>‹ Préc.</Button>
            <Typography variant="body2" sx={{ alignSelf: "center" }}>
              Page {page + 1} / {totalPages}
            </Typography>
            <Button size="small" disabled={page >= totalPages - 1} onClick={() => load(page + 1)}>Suiv. ›</Button>
          </Box>
        )}
      </Container>
    </AdminLayout>
  );
}
