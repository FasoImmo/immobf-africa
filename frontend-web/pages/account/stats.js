import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Paper, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Tooltip,
} from "@mui/material";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer, Legend,
} from "recharts";
import Layout from "../../components/Layout";
import { Analytics } from "../../lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n) {
  return Number(n || 0).toLocaleString("fr-FR");
}

function statusChip(s) {
  const map = {
    active:         { label: "Active",         color: "success" },
    expiring_soon:  { label: "Expire bientôt", color: "warning" },
    expired:        { label: "Expirée",         color: "error"   },
    no_subscription:{ label: "Non publiée",     color: "default" },
  };
  const cfg = map[s] || { label: s, color: "default" };
  return <Chip label={cfg.label} color={cfg.color} size="small" />;
}

function KpiCard({ label, value, icon, color = "primary.main" }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: "1px solid #e0e0e0", height: "100%" }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, mt: 0.5 }}>
        <Typography variant="h4" fontWeight={700} color={color}>{fmtNum(value)}</Typography>
        {icon && <Typography sx={{ fontSize: 22 }}>{icon}</Typography>}
      </Box>
    </Paper>
  );
}

// Remplir les jours manquants sur 30 jours
function fillDays(viewsByDay) {
  const map = {};
  (viewsByDay || []).forEach((r) => { map[r.day] = r; });
  const out = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      day: key,
      views: parseInt(map[key]?.views || 0),
      whatsapp_clicks: parseInt(map[key]?.whatsapp_clicks || 0),
    });
  }
  return out;
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function SellerStatsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("immobf_token") : null;
    if (!token) { router.push("/login"); return; }
    Analytics.dashboard()
      .then((d) => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return (
    <Layout title="Tableau de bord — ImmoBF">
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}><CircularProgress /></Box>
    </Layout>
  );

  if (!data) return (
    <Layout title="Tableau de bord — ImmoBF">
      <Typography color="error">Impossible de charger les statistiques.</Typography>
    </Layout>
  );

  const { totals, listings, views_by_day } = data;
  const chartData = fillDays(views_by_day);

  return (
    <Layout title="Tableau de bord annonceur — ImmoBF">
      <Typography variant="h4" fontWeight={700} gutterBottom>📊 Tableau de bord</Typography>

      {/* ─── KPIs ─────────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Annonces actives"  value={totals.active_listings}   icon="🏠" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Vues totales"       value={totals.total_views}        icon="👁️" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Vues (7 jours)"     value={totals.views_7d}           icon="📅" color="secondary.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Clics WhatsApp"     value={totals.whatsapp_clicks}    icon="💬" color="success.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Conversations"      value={totals.total_conversations} icon="✉️" color="warning.main" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Non lus"            value={totals.unread_messages}    icon="🔔" color={totals.unread_messages > 0 ? "error.main" : "text.secondary"} />
        </Grid>
      </Grid>

      {/* ─── Graphique vues/jour ──────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e0e0e0", mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>Activité — 30 derniers jours</Typography>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#0E7C66" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0E7C66" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="gradWa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#25D366" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#25D366" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => {
                const d = new Date(v + "T00:00:00");
                return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
              }}
              interval={4}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <ReTooltip
              labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            />
            <Legend />
            <Area type="monotone" dataKey="views"           name="Vues"           stroke="#0E7C66" fill="url(#gradViews)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="whatsapp_clicks" name="Clics WhatsApp" stroke="#25D366" fill="url(#gradWa)"    strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Paper>

      {/* ─── Tableau par annonce ──────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: "1px solid #e0e0e0" }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Performance par annonce ({totals.total_listings})
        </Typography>
        {listings.length === 0 ? (
          <Typography color="text.secondary">Aucune annonce pour l&apos;instant.</Typography>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, whiteSpace: "nowrap" } }}>
                  <TableCell>Annonce</TableCell>
                  <TableCell align="right">Vues</TableCell>
                  <TableCell align="right">7 j</TableCell>
                  <TableCell align="right">Visiteurs</TableCell>
                  <TableCell align="right">WhatsApp</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell>Expiration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listings.map((l) => (
                  <TableRow key={l.id} hover sx={{ cursor: "pointer" }}>
                    <TableCell>
                      <Tooltip title={l.title} placement="top">
                        <Link href={`/properties/${l.id}`} style={{ color: "#0E7C66", fontWeight: 600, textDecoration: "none" }}>
                          {l.title.length > 40 ? l.title.slice(0, 38) + "…" : l.title}
                        </Link>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        {l.city}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fmtNum(l.total_views)}</TableCell>
                    <TableCell align="right">{fmtNum(l.views_7d)}</TableCell>
                    <TableCell align="right">{fmtNum(l.unique_visitors)}</TableCell>
                    <TableCell align="right">{fmtNum(l.whatsapp_clicks)}</TableCell>
                    <TableCell>{statusChip(l.subscription_status)}</TableCell>
                    <TableCell>
                      {l.listing_expires_at
                        ? new Date(l.listing_expires_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Layout>
  );
}
