import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Box, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, CircularProgress, Chip, TextField, InputAdornment,
  Grid, Divider, Alert, Drawer, IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "../../components/AdminLayout";
import { Admin } from "../../lib/api";
import { formatFCFA } from "../../lib/format";

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

// KPI card component
function KpiCard({ label, value, color = "text.primary", subtitle }) {
  return (
    <Paper elevation={1} sx={{ p: 2, textAlign: "center", height: "100%" }}>
      <Typography variant="h4" color={color} fontWeight={700}>{value}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{label}</Typography>
      {subtitle && (
        <Typography variant="caption" color="text.disabled">{subtitle}</Typography>
      )}
    </Paper>
  );
}

// Preset period helpers
function today() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Aujourd'hui",      start: today,        end: today },
  { label: "7 derniers jours", start: () => daysAgo(6), end: today },
  { label: "30 derniers jours",start: () => daysAgo(29), end: today },
  { label: "Ce mois",         start: startOfMonth, end: today },
  { label: "Cette année",     start: startOfYear,  end: today },
  { label: "Tout",            start: () => "",     end: () => "" },
];

export default function AdminRevenues() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(null);

  // Period filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Payment stats
  const [period, setPeriod] = useState(null);
  const [byProvider, setByProvider] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState(null);

  // Stats par mode de paiement (opérateur)
  const [byMode, setByMode] = useState([]);
  const [byModeProvider, setByModeProvider] = useState("");
  const [byModeLoading, setByModeLoading] = useState(false);

  // Annonceurs
  const [annonceurs, setAnnonceurs] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [detailUser, setDetailUser] = useState(null);    // { user, transactions, interactions }
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { accessGuard(router, setAuthorized); }, []); // eslint-disable-line

  // Load annonceurs once on mount
  useEffect(() => {
    if (authorized !== true) return;
    setAnnLoading(true);
    Admin.revenues()
      .then((d) => setAnnonceurs(d.annonceurs || []))
      .finally(() => setAnnLoading(false));
  }, [authorized]);

  // Load payment stats (re-runs on period change)
  const loadStats = useCallback(() => {
    if (authorized !== true) return;
    setStatsLoading(true);
    setStatsErr(null);
    const params = {};
    if (startDate) params.start = startDate;
    if (endDate)   params.end   = endDate;
    Admin.paymentStats(params)
      .then((d) => { setPeriod(d.period); setByProvider(d.byProvider || []); })
      .catch(() => setStatsErr("Impossible de charger les statistiques de paiement."))
      .finally(() => setStatsLoading(false));
  }, [authorized, startDate, endDate]);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Load stats by mode/operator (re-runs on period or provider filter change)
  const loadStatsByMode = useCallback(() => {
    if (authorized !== true) return;
    setByModeLoading(true);
    const params = {};
    if (startDate)      params.start    = startDate;
    if (endDate)        params.end      = endDate;
    if (byModeProvider) params.provider = byModeProvider;
    Admin.paymentStatsByMode(params)
      .then((d) => setByMode(d.rows || []))
      .catch(() => setByMode([]))
      .finally(() => setByModeLoading(false));
  }, [authorized, startDate, endDate, byModeProvider]);

  useEffect(() => { loadStatsByMode(); }, [loadStatsByMode]);

  if (authorized === null) {
    return (
      <AdminLayout title="Paiements — Admin ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
      </AdminLayout>
    );
  }
  if (authorized === false) {
    return (
      <AdminLayout title="Paiements — Admin ImmoBF">
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h5">Accès refusé</Typography>
        </Paper>
      </AdminLayout>
    );
  }

  // Annonceurs filter
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

  async function openDetail(userId) {
    setDetailLoading(true);
    setDetailUser(null);
    try {
      const d = await Admin.userStats(userId);
      setDetailUser(d);
    } catch (e) {
      alert(e?.response?.data?.error?.message || "Erreur lors du chargement des détails.");
    } finally {
      setDetailLoading(false);
    }
  }

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

  const periodLabel = (!startDate && !endDate)
    ? "Tout"
    : `${startDate || "…"} → ${endDate || "…"}`;

  return (
    <AdminLayout title="Paiements & Revenus — Admin ImmoBF">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Button variant="text" onClick={() => router.push("/admin")}>← Tableau de bord</Button>
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Paiements &amp; Revenus
        </Typography>
        <Button variant="text" size="small" onClick={() => router.push("/admin/profile")}>
          ⚙️ Mon profil
        </Button>
      </Box>

      {/* ── Section 1 : filtre période ───────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f9f9f9", borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          Période d'analyse
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          {PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              size="small"
              clickable
              variant={
                startDate === p.start() && endDate === p.end() ? "filled" : "outlined"
              }
              color={startDate === p.start() && endDate === p.end() ? "primary" : "default"}
              onClick={() => { setStartDate(p.start()); setEndDate(p.end()); }}
            />
          ))}
        </Box>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            size="small" type="date" label="Du"
            value={startDate} onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          <TextField
            size="small" type="date" label="Au"
            value={endDate} onChange={(e) => setEndDate(e.target.value)}
            InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
          />
          {statsLoading && <CircularProgress size={18} />}
        </Box>
      </Paper>

      {statsErr && <Alert severity="error" sx={{ mb: 2 }}>{statsErr}</Alert>}

      {/* ── Section 2 : KPIs période ────────────────────────────────────── */}
      {period && (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            KPIs — {periodLabel}
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="CA total"
                value={formatFCFA(period.total_revenue)}
                color="success.main"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Transactions réussies"
                value={period.nb_succeeded}
                color="success.main"
                subtitle={`dont frais: ${formatFCFA(period.revenue_listing)}`}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Transactions échouées"
                value={period.nb_failed}
                color="error.main"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="En attente"
                value={period.nb_pending}
                color="warning.main"
                subtitle={`Annulés: ${period.nb_cancelled}`}
              />
            </Grid>
          </Grid>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KpiCard label="Total transactions" value={period.nb_total} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="Annonceurs actifs"
                value={period.nb_annonceurs_actifs}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="CA frais publication"
                value={formatFCFA(period.revenue_listing)}
                color="primary.main"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KpiCard
                label="CA commissions"
                value={formatFCFA(period.revenue_commission)}
                color="primary.main"
              />
            </Grid>
          </Grid>
        </>
      )}

      {/* ── Section 3 : répartition par provider ────────────────────────── */}
      {byProvider.length > 0 && (
        <>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
            Répartition par source de paiement
          </Typography>
          <Paper sx={{ overflowX: "auto", mb: 4 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, background: "#f5f5f5" } }}>
                  <TableCell>Provider</TableCell>
                  <TableCell align="right">CA réussi</TableCell>
                  <TableCell align="right">Réussies</TableCell>
                  <TableCell align="right">Échouées</TableCell>
                  <TableCell align="right">En attente</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Taux succès</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {byProvider.map((p) => {
                  const rate = Number(p.nb_total) > 0
                    ? Math.round((Number(p.nb_succeeded) / Number(p.nb_total)) * 100)
                    : 0;
                  return (
                    <TableRow key={p.provider} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>
                          {p.provider}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color={Number(p.total_revenue) > 0 ? "success.main" : "text.secondary"}>
                          {formatFCFA(p.total_revenue)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main">{p.nb_succeeded}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={Number(p.nb_failed) > 0 ? "error.main" : "text.secondary"}>
                          {p.nb_failed}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="warning.main">{p.nb_pending}</Typography>
                      </TableCell>
                      <TableCell align="right">{p.nb_total}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${rate}%`}
                          size="small"
                          color={rate >= 70 ? "success" : rate >= 40 ? "warning" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}

      {/* ── Section 4 : répartition par mode de paiement (opérateur) ─────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          Répartition par mode de paiement
          {byModeLoading && <CircularProgress size={14} sx={{ ml: 1 }} />}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[{ v: "", l: "Tous" }, { v: "pawapay", l: "PawaPay" }, { v: "fedapay", l: "FedaPay" }, { v: "cinetpay", l: "CinetPay" }].map(({ v, l }) => (
            <Chip
              key={v}
              label={l}
              size="small"
              clickable
              variant={byModeProvider === v ? "filled" : "outlined"}
              color={byModeProvider === v ? "primary" : "default"}
              onClick={() => setByModeProvider(v)}
            />
          ))}
        </Box>
      </Box>

      {byMode.length > 0 ? (
        <Paper sx={{ overflowX: "auto", mb: 4 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ "& th": { fontWeight: 700, background: "#f5f5f5" } }}>
                <TableCell>Provider</TableCell>
                <TableCell>Opérateur</TableCell>
                <TableCell align="right">CA réussi</TableCell>
                <TableCell align="right">Réussies</TableCell>
                <TableCell align="right">Échouées</TableCell>
                <TableCell align="right">En attente</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Taux succès</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byMode.map((m, i) => {
                const rate = Number(m.nb_total) > 0
                  ? Math.round((Number(m.nb_succeeded) / Number(m.nb_total)) * 100)
                  : 0;
                const opLabel = {
                  orange_money: "Orange Money",
                  moov_money:   "Moov Money",
                  wave:         "Wave",
                  mtn:          "MTN Mobile Money",
                  airtel:       "Airtel Money",
                  vodafone:     "Vodafone Cash",
                  card:         "Carte bancaire",
                  unknown:      "—",
                }[m.operator] || m.operator;
                return (
                  <TableRow key={`${m.provider}-${m.operator}-${i}`} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: "capitalize" }}>{m.provider}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{opLabel}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color={Number(m.total_revenue) > 0 ? "success.main" : "text.secondary"}>
                        {formatFCFA(m.total_revenue)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="success.main">{m.nb_succeeded}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={Number(m.nb_failed) > 0 ? "error.main" : "text.secondary"}>{m.nb_failed}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="warning.main">{m.nb_pending}</Typography>
                    </TableCell>
                    <TableCell align="right">{m.nb_total}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${rate}%`}
                        size="small"
                        color={rate >= 70 ? "success" : rate >= 40 ? "warning" : "error"}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        !byModeLoading && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Aucune donnée de mode de paiement pour cette période.
          </Typography>
        )
      )}

      <Divider sx={{ mb: 3 }} />

      {/* ── Section 5 : annonceurs (all-time) ───────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
          Revenus par annonceur (all-time)
        </Typography>
        <Button variant="outlined" size="small" onClick={exportCsv}>Exporter CSV</Button>
      </Box>

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

      {annLoading && <CircularProgress size={20} sx={{ mb: 2 }} />}

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
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((a) => {
              const b = badge(Number(a.nb_transactions));
              return (
                <TableRow key={a.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{a.full_name || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">{a.phone}</Typography>
                    {a.email && (
                      <Typography variant="caption" color="text.secondary" display="block">{a.email}</Typography>
                    )}
                  </TableCell>
                  <TableCell><Typography variant="body2">{a.main_country || "—"}</Typography></TableCell>
                  <TableCell align="right">{a.nb_annonces}</TableCell>
                  <TableCell align="right">{a.nb_transactions}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color={Number(a.total_paid) > 0 ? "#1B6B3A" : "text.secondary"}>
                      {formatFCFA(a.total_paid)}
                    </Typography>
                  </TableCell>
                  <TableCell><Chip label={b.label} color={b.color} size="small" /></TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {a.last_payment_at ? new Date(a.last_payment_at).toLocaleDateString("fr-FR") : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" onClick={() => openDetail(a.id)}>
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && !annLoading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  Aucun annonceur trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="caption" color="text.secondary">Fidélité :</Typography>
        <Chip label="Nouveau (1 tx)" color="default" size="small" />
        <Chip label="Régulier (2–4 tx)" color="primary" size="small" />
        <Chip label="Fidèle ⭐ (5+ tx)" color="success" size="small" />
      </Box>

      {/* ── Drawer : détails annonceur ───────────────────────────────────── */}
      <Drawer
        anchor="right"
        open={!!detailUser || detailLoading}
        onClose={() => setDetailUser(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 560 }, p: 3, overflowX: "hidden" } }}
      >
        {detailLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!detailLoading && detailUser && (
          <>
            {/* En-tête */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {detailUser.user.full_name || detailUser.user.phone}
                </Typography>
                {detailUser.user.email && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {detailUser.user.email}
                  </Typography>
                )}
                {detailUser.user.phone && detailUser.user.full_name && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {detailUser.user.phone}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary" display="block">
                  Inscrit le {new Date(detailUser.user.created_at).toLocaleDateString("fr-FR")}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetailUser(null)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Transactions */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Transactions ({detailUser.transactions.length})
            </Typography>

            {detailUser.transactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Aucune transaction.
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto", mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.72rem", whiteSpace: "nowrap" } }}>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Référence</TableCell>
                      <TableCell>Annonce</TableCell>
                      <TableCell>Statut</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailUser.transactions.map((t) => (
                      <TableRow key={t.id} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                            {new Date(t.created_at).toLocaleDateString("fr-FR")}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" fontWeight={700} color={t.status === "succeeded" ? "#1B6B3A" : "text.secondary"}>
                            {formatFCFA(t.amount)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
                            {t.provider || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: "monospace", fontSize: "0.68rem" }}>
                            {t.reference ? t.reference.slice(0, 12) + (t.reference.length > 12 ? "…" : "") : "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ maxWidth: 120, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.property_title || "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={t.status}
                            size="small"
                            color={t.status === "succeeded" ? "success" : t.status === "pending" ? "warning" : "error"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Interactions */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Interactions sur les annonces ({detailUser.interactions.length} annonce(s))
            </Typography>

            {detailUser.interactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune interaction enregistrée.
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, fontSize: "0.72rem" } }}>
                      <TableCell>Annonce</TableCell>
                      <TableCell align="right">Vues</TableCell>
                      <TableCell align="right">Clics WhatsApp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detailUser.interactions.map((i) => (
                      <TableRow key={i.property_id} hover>
                        <TableCell>
                          <Typography variant="caption" sx={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {i.property_title || `Annonce #${i.property_id}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" fontWeight={700}>{i.views || 0}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" fontWeight={700} color={Number(i.whatsapp_clicks) > 0 ? "success.main" : "text.secondary"}>
                            {i.whatsapp_clicks || 0}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </>
        )}
      </Drawer>
    </AdminLayout>
  );
}
