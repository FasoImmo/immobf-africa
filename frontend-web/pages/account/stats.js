import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Paper, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Tooltip, Button, Alert, Divider, IconButton,
  ToggleButton, ToggleButtonGroup, LinearProgress,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend, BarChart, Bar,
} from "recharts";
import Layout from "../../components/Layout";
import { Analytics } from "../../lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n) { return Number(n || 0).toLocaleString("fr-FR"); }

function pct(a, b) {
  if (!b || Number(b) === 0) return 0;
  return Math.round((Number(a) / Number(b)) * 100);
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function statusChip(s) {
  const map = {
    active:          { label: "Active",         color: "success" },
    expiring_soon:   { label: "Expire bientôt", color: "warning" },
    expired:         { label: "Expirée",         color: "error"   },
    no_subscription: { label: "Non publiée",     color: "default" },
  };
  const cfg = map[s] || { label: s, color: "default" };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
}

// Remplir les jours manquants
function fillDays(viewsByDay, days = 30) {
  const map = {};
  (viewsByDay || []).forEach((r) => { map[r.day] = r; });
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      day: key,
      views: parseInt(map[key]?.views || 0),
      whatsapp_clicks: parseInt(map[key]?.whatsapp_clicks || 0),
    });
  }
  return out;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = "#0E7C66", sub, highlight }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5, borderRadius: 3, height: "100%",
        border: highlight ? `2px solid ${color}` : "1px solid #e8e8e8",
        background: highlight ? `${color}08` : "#fff",
        transition: "box-shadow .2s",
        "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{icon}</Typography>
      </Box>
      <Typography variant="h3" fontWeight={800} sx={{ color, mt: 1, mb: 0.5, lineHeight: 1.1 }}>
        {fmtNum(value)}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      )}
    </Paper>
  );
}

// ─── Listing Row ──────────────────────────────────────────────────────────────
function ListingRow({ l, maxViews }) {
  const conv = pct(l.whatsapp_clicks, l.total_views);
  const barPct = maxViews > 0 ? Math.round((Number(l.total_views) / maxViews) * 100) : 0;
  const expSoon = l.subscription_status === "expiring_soon" || l.subscription_status === "expired";

  return (
    <TableRow hover sx={{ "&:hover td": { bgcolor: "#f9fffe" } }}>
      <TableCell sx={{ maxWidth: 240 }}>
        <Tooltip title={l.title} placement="top">
          <Link href={`/properties/${l.id}`} target="_blank"
            style={{ color: "#0E7C66", fontWeight: 700, textDecoration: "none", fontSize: 13 }}>
            {l.title.length > 42 ? l.title.slice(0, 40) + "…" : l.title}
          </Link>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          📍 {l.city || "—"}
        </Typography>
        <LinearProgress
          variant="determinate" value={barPct}
          sx={{ mt: 0.5, height: 3, borderRadius: 2,
            "& .MuiLinearProgress-bar": { bgcolor: "#0E7C66" }, bgcolor: "#e8f5f0" }}
        />
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight={700}>{fmtNum(l.total_views)}</Typography>
        <Typography variant="caption" color="text.secondary">{fmtNum(l.views_7d)} / 7j</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2">{fmtNum(l.unique_visitors)}</Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight={700} color={Number(l.whatsapp_clicks) > 0 ? "#25D366" : "text.secondary"}>
          {fmtNum(l.whatsapp_clicks)}
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Chip
          label={`${conv}%`} size="small"
          color={conv >= 10 ? "success" : conv >= 3 ? "warning" : "default"}
        />
      </TableCell>
      <TableCell>{statusChip(l.subscription_status)}</TableCell>
      <TableCell>
        <Typography variant="caption" color={expSoon ? "error.main" : "text.secondary"}>
          {l.listing_expires_at
            ? new Date(l.listing_expires_at).toLocaleDateString("fr-FR")
            : "—"}
        </Typography>
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Voir l'annonce">
            <IconButton size="small" component={Link} href={`/properties/${l.id}`} target="_blank">
              <OpenInNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Modifier">
            <IconButton size="small" component={Link} href={`/properties/${l.id}/edit`}>
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SellerStatsPage() {
  const router = useRouter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState("30");
  const [sortBy, setSortBy]   = useState("views");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.push("/login"); return; }
    Analytics.dashboard()
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  const chartData = useMemo(() => {
    if (!data) return [];
    return fillDays(data.views_by_day, Number(period));
  }, [data, period]);

  const sortedListings = useMemo(() => {
    if (!data?.listings) return [];
    return [...data.listings].sort((a, b) => {
      if (sortBy === "views")    return Number(b.total_views) - Number(a.total_views);
      if (sortBy === "whatsapp") return Number(b.whatsapp_clicks) - Number(a.whatsapp_clicks);
      if (sortBy === "conv")     return pct(b.whatsapp_clicks, b.total_views) - pct(a.whatsapp_clicks, a.total_views);
      if (sortBy === "7d")       return Number(b.views_7d) - Number(a.views_7d);
      return 0;
    });
  }, [data, sortBy]);

  if (loading) return (
    <Layout title="Tableau de bord — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>
    </Layout>
  );

  if (!data) return (
    <Layout title="Tableau de bord — ImmoBF">
      <Alert severity="error">Impossible de charger les statistiques. Rechargez la page.</Alert>
    </Layout>
  );

  const { totals, listings } = data;
  const maxViews = Math.max(...(listings || []).map((l) => Number(l.total_views)), 1);
  const topListing = sortedListings[0];
  const globalConv = pct(totals.whatsapp_clicks, totals.total_views);
  const totalViews7d = chartData.slice(-7).reduce((s, d) => s + d.views, 0);
  const totalViews30d = chartData.reduce((s, d) => s + d.views, 0);

  return (
    <Layout title="Tableau de bord annonceur — ImmoBF">
      {/* ─── En-tête ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: "#0E7C66" }}>
            📊 Tableau de bord
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totals.total_listings} annonce(s) · {fmtNum(totals.total_views)} vues au total
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          {totals.unread_messages > 0 && (
            <Button variant="contained" color="error" size="small"
              onClick={() => router.push("/messages")}>
              🔔 {totals.unread_messages} message(s) non lu(s)
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={() => router.push("/account")}>
            Mon compte
          </Button>
          <Button variant="contained" size="small" onClick={() => router.push("/sell")}
            sx={{ bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0A6355" } }}>
            + Publier
          </Button>
        </Box>
      </Box>

      {/* ─── Alerte expiration ─────────────────────────────────────────────── */}
      {listings.some((l) => l.subscription_status === "expiring_soon") && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button size="small" onClick={() => router.push("/plans")}>Renouveler</Button>
        }>
          Une ou plusieurs annonces expirent bientôt.
        </Alert>
      )}
      {listings.some((l) => l.subscription_status === "expired") && (
        <Alert severity="error" sx={{ mb: 3 }} action={
          <Button size="small" color="error" onClick={() => router.push("/plans")}>Renouveler</Button>
        }>
          Une ou plusieurs annonces ont expiré et ne sont plus visibles.
        </Alert>
      )}

      {/* ─── KPIs ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Annonces actives" value={totals.active_listings}
            icon="🏠" color="#0E7C66" highlight={totals.active_listings > 0}
            sub={`sur ${totals.total_listings} au total`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Vues totales" value={totals.total_views}
            icon="👁️" color="#1565C0"
            sub={`${fmtNum(totals.views_7d)} cette semaine`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Vues (30 jours)" value={totalViews30d}
            icon="📈" color="#6A1B9A"
            sub={`${fmtNum(totalViews7d)} / 7j`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Clics WhatsApp" value={totals.whatsapp_clicks}
            icon="💬" color="#25D366" highlight={totals.whatsapp_clicks > 0}
            sub={`taux contact : ${globalConv}%`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Conversations" value={totals.total_conversations}
            icon="✉️" color="#E0A500" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Messages non lus" value={totals.unread_messages}
            icon="🔔" color={totals.unread_messages > 0 ? "#D32F2F" : "#888"}
            highlight={totals.unread_messages > 0} />
        </Grid>
      </Grid>

      {/* ─── Top annonce ──────────────────────────────────────────────────── */}
      {topListing && (
        <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, border: "1px solid #c8e6c9", bgcolor: "#f1f8f1", display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 28 }}>🏆</Typography>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
              Meilleure annonce
            </Typography>
            <Typography variant="subtitle1" fontWeight={700} color="#0E7C66">
              {topListing.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmtNum(topListing.total_views)} vues · {fmtNum(topListing.whatsapp_clicks)} clics WhatsApp · taux {pct(topListing.whatsapp_clicks, topListing.total_views)}%
            </Typography>
          </Box>
          <Button variant="outlined" size="small" component={Link} href={`/properties/${topListing.id}`} target="_blank">
            Voir
          </Button>
          <Button variant="outlined" size="small" component={Link} href={`/properties/${topListing.id}/edit`}>
            Modifier
          </Button>
        </Paper>
      )}

      {/* ─── Graphique activité ───────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e8e8e8", mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>Activité — vues & contacts</Typography>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => { if (v) setPeriod(v); }} size="small">
            <ToggleButton value="7">7 j</ToggleButton>
            <ToggleButton value="14">14 j</ToggleButton>
            <ToggleButton value="30">30 j</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0E7C66" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0E7C66" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gradWa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#25D366" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#25D366" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={period === "7" ? 0 : period === "14" ? 1 : 4}
              tickFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ReTooltip
              contentStyle={{ borderRadius: 10, fontSize: 13 }}
              labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}
            />
            <Legend />
            <Area type="monotone" dataKey="views"           name="Vues"           stroke="#0E7C66" fill="url(#gradViews)" strokeWidth={2.5} dot={false} />
            <Area type="monotone" dataKey="whatsapp_clicks" name="Clics WhatsApp" stroke="#25D366" fill="url(#gradWa)"    strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* ─── Tableau par annonce ──────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e8e8e8" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="h6" fontWeight={700}>
            Performance par annonce
            <Chip label={totals.total_listings} size="small" sx={{ ml: 1 }} />
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary">Trier par :</Typography>
            {[
              { v: "views",    l: "Vues" },
              { v: "7d",       l: "7 jours" },
              { v: "whatsapp", l: "WhatsApp" },
              { v: "conv",     l: "Taux contact" },
            ].map(({ v, l }) => (
              <Chip key={v} label={l} size="small" clickable
                variant={sortBy === v ? "filled" : "outlined"}
                color={sortBy === v ? "primary" : "default"}
                onClick={() => setSortBy(v)} />
            ))}
          </Box>
        </Box>

        {sortedListings.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Typography sx={{ fontSize: 48, mb: 2 }}>🏠</Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom>Aucune annonce pour l&apos;instant</Typography>
            <Button variant="contained" onClick={() => router.push("/sell")}
              sx={{ bgcolor: "#0E7C66", "&:hover": { bgcolor: "#0A6355" }, mt: 1 }}>
              Publier ma première annonce
            </Button>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap", color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 } }}>
                  <TableCell>Annonce</TableCell>
                  <TableCell align="right">Vues</TableCell>
                  <TableCell align="right">Visiteurs</TableCell>
                  <TableCell align="right">WhatsApp</TableCell>
                  <TableCell align="right">Taux contact</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Expiration</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedListings.map((l) => (
                  <ListingRow key={l.id} l={l} maxViews={maxViews} />
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Divider sx={{ mt: 3, mb: 2 }} />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>Taux de contact =</Typography>
          <Typography variant="caption" color="text.secondary">clics WhatsApp / vues totales</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip label="≥ 10% Excellent" color="success" size="small" variant="outlined" />
          <Chip label="3-9% Bon"        color="warning" size="small" variant="outlined" />
          <Chip label="< 3% À améliorer" color="default" size="small" variant="outlined" />
        </Box>
      </Paper>
    </Layout>
  );
}
