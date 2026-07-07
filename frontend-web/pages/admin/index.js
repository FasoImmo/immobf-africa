import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Box, Grid, Paper, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, CircularProgress, Chip, Avatar,
} from "@mui/material";
import TrendingUpIcon      from "@mui/icons-material/TrendingUp";
import ReceiptLongIcon     from "@mui/icons-material/ReceiptLong";
import PeopleAltIcon       from "@mui/icons-material/PeopleAlt";
import ApartmentIcon       from "@mui/icons-material/Apartment";
import CheckCircleIcon     from "@mui/icons-material/CheckCircle";
import PendingIcon         from "@mui/icons-material/Pending";
import CancelIcon          from "@mui/icons-material/Cancel";
import EmojiEventsIcon     from "@mui/icons-material/EmojiEvents";
import PublicIcon          from "@mui/icons-material/Public";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import AdminLayout    from "../../components/AdminLayout";
import { Admin }      from "../../lib/api";
import { formatFCFA } from "../../lib/format";

// ── Palette ────────────────────────────────────────────────────────────────
const TEAL = "#0E7C66";
const PROVIDER_COLORS = {
  pawapay:    "#FF6B35",
  fedapay:    "#7C3AED",
  cinetpay:   "#0369A1",
  flutterwave:"#F59E0B",
  default:    "#64748B",
};
function pColor(name) { return PROVIDER_COLORS[(name||"").toLowerCase()] || PROVIDER_COLORS.default; }

// ── KPI card ──────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color = TEAL, sub }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2.5, height: "100%", borderLeft: `4px solid ${color}`, "&:hover": { boxShadow: 4 }, transition: "box-shadow .15s" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
        <Typography variant="caption" sx={{ color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 }}>
          {label}
        </Typography>
        <Box sx={{ bgcolor: color + "18", borderRadius: 1.5, p: 0.75, color, display: "flex" }}>{icon}</Box>
      </Box>
      <Typography variant="h5" fontWeight={800} sx={{ color: "#0F172A" }}>{value}</Typography>
      {sub && <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: 11, mt: 0.25, display: "block" }}>{sub}</Typography>}
    </Paper>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, fontSize: 13, borderRadius: 1.5 }}>
      {payload.map((p) => (
        <Typography key={p.dataKey} sx={{ color: p.fill || p.color }}>{formatFCFA(p.value)}</Typography>
      ))}
    </Paper>
  );
}

const STATUS_COLOR  = { succeeded: "success", pending: "warning", failed: "error" };
const PURPOSE_LABEL = { listing_fee: "Publication", commission: "Commission" };

export default function AdminDashboard() {
  const router = useRouter();
  const [loading,    setLoading]    = useState(true);
  const [data,       setData]       = useState(null);
  const [properties, setProperties] = useState([]);
  const [byProvider, setByProvider] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([Admin.revenues(), Admin.properties({ limit: 500 }), Admin.paymentStats()])
      .then(([rev, props, ps]) => {
        setData(rev);
        setProperties(props.properties || []);
        setByProvider((ps.byProvider || []).map((p) => ({
          ...p, name: (p.provider || "?").toUpperCase(),
          total_revenue: Number(p.total_revenue) || 0,
        })));
      })
      .finally(() => setLoading(false));
  }, []);

  const stats  = data?.stats || {};
  const top5   = (data?.annonceurs || []).slice(0, 5);
  const txs    = data?.transactions || [];
  const totalTx = (stats.nb_succeeded||0) + (stats.nb_failed||0) + (stats.nb_pending||0);
  const successRate = totalTx > 0 ? Math.round(((stats.nb_succeeded||0)/totalTx)*100) : 0;
  const byCountry = properties.reduce((acc, p) => { const c=p.country_code||"ND"; acc[c]=(acc[c]||0)+1; return acc; }, {});

  return (
    <AdminLayout title="Tableau de bord — Admin ImmoBF">
      {/* ── KPI row 1 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard label="Chiffre d'affaires" value={formatFCFA(stats.total_revenue||0)}
            icon={<TrendingUpIcon fontSize="small" />} color={TEAL}
            sub={`${formatFCFA(stats.revenue_listing||0)} pub + ${formatFCFA(stats.revenue_commission||0)} com.`} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Transactions réussies" value={stats.nb_succeeded||0}
            icon={<CheckCircleIcon fontSize="small" />} color="#16a34a"
            sub={`Taux : ${successRate}%`} />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="En attente" value={stats.nb_pending||0}
            icon={<PendingIcon fontSize="small" />} color="#d97706" />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Échouées" value={stats.nb_failed||0}
            icon={<CancelIcon fontSize="small" />} color="#dc2626" />
        </Grid>
      </Grid>

      {/* ── KPI row 2 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Annonceurs actifs" value={stats.nb_annonceurs_actifs||0}
            icon={<PeopleAltIcon fontSize="small" />} color="#7c3aed" />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Annonces publiées" value={properties.length}
            icon={<ApartmentIcon fontSize="small" />} color="#0369a1" />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Frais de publication" value={formatFCFA(stats.revenue_listing||0)}
            icon={<ReceiptLongIcon fontSize="small" />} color="#0891b2" />
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <KpiCard label="Commissions" value={formatFCFA(stats.revenue_commission||0)}
            icon={<EmojiEventsIcon fontSize="small" />} color="#be185d" />
        </Grid>
      </Grid>

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Bar chart providers */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 2.5, height: 300 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, color: "#0F172A" }}>
              Revenus par fournisseur de paiement
            </Typography>
            {loading ? (
              <Box sx={{ display:"flex", justifyContent:"center", alignItems:"center", height:200 }}>
                <CircularProgress size={28} sx={{ color: TEAL }} />
              </Box>
            ) : byProvider.length === 0 ? (
              <Box sx={{ display:"flex", justifyContent:"center", alignItems:"center", height:200 }}>
                <Typography color="text.disabled">Aucune transaction</Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byProvider} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize:12, fill:"#64748B" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize:11, fill:"#94A3B8" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v>=1000 ? (v/1000)+"k" : v} />
                  <RTooltip content={<CustomTooltip />} />
                  <Bar dataKey="total_revenue" radius={[6,6,0,0]}>
                    {byProvider.map((e) => <Cell key={e.name} fill={pColor(e.name)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Annonces par pays */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 2.5, height: 300, display:"flex", flexDirection:"column" }}>
            <Box sx={{ display:"flex", alignItems:"center", gap:1, mb:2 }}>
              <PublicIcon fontSize="small" sx={{ color: TEAL }} />
              <Typography variant="subtitle1" fontWeight={700} sx={{ color:"#0F172A" }}>Annonces par pays</Typography>
            </Box>
            <Box sx={{ flex:1, overflowY:"auto" }}>
              {Object.entries(byCountry).sort((a,b)=>b[1]-a[1]).map(([c,n]) => {
                const pct = properties.length > 0 ? Math.round((n/properties.length)*100) : 0;
                return (
                  <Box key={c} sx={{ mb:1.5 }}>
                    <Box sx={{ display:"flex", justifyContent:"space-between", mb:0.5 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize:13 }}>{c}</Typography>
                      <Typography variant="caption" color="text.secondary">{n} ({pct}%)</Typography>
                    </Box>
                    <Box sx={{ height:6, bgcolor:"#F1F5F9", borderRadius:3, overflow:"hidden" }}>
                      <Box sx={{ height:"100%", width:`${pct}%`, bgcolor:TEAL, borderRadius:3 }} />
                    </Box>
                  </Box>
                );
              })}
              {Object.keys(byCountry).length === 0 && !loading && (
                <Typography color="text.disabled" variant="body2">Aucune annonce</Typography>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Top annonceurs ─────────────────────────────────────────────── */}
      <Paper sx={{ p:3, borderRadius:2.5, mb:3 }}>
        <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
            <EmojiEventsIcon sx={{ color:"#d97706", fontSize:20 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color:"#0F172A" }}>Top annonceurs</Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={() => router.push("/admin/revenues")}
            sx={{ borderRadius:1.5, fontSize:12 }}>Voir tous</Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ "& th":{ fontWeight:700, color:"#475569", fontSize:12, bgcolor:"#F8FAFC", border:0 } }}>
              <TableCell>#</TableCell><TableCell>Annonceur</TableCell><TableCell>Pays</TableCell>
              <TableCell align="right">Annonces</TableCell><TableCell align="right">Total payé</TableCell>
              <TableCell>Dernière activité</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {top5.map((a, i) => (
              <TableRow key={a.id} hover sx={{ "&:last-child td":{ border:0 } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} sx={{ color: i===0?"#d97706":"#94A3B8" }}>#{i+1}</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display:"flex", alignItems:"center", gap:1.5 }}>
                    <Avatar sx={{ width:30, height:30, bgcolor:TEAL+"22", color:TEAL, fontSize:13, fontWeight:700 }}>
                      {(a.full_name||"?")[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize:13 }}>{a.full_name||"ND"}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.phone||a.email||""}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell><Typography variant="caption" fontWeight={600}>{a.main_country||"ND"}</Typography></TableCell>
                <TableCell align="right"><Chip label={a.nb_annonces} size="small" sx={{ fontWeight:700 }} /></TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} sx={{ color:TEAL }}>{formatFCFA(a.total_paid)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary">
                    {a.last_payment_at ? new Date(a.last_payment_at).toLocaleDateString("fr-FR") : "—"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {top5.length===0 && !loading && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py:4, color:"text.disabled" }}>Aucune donnée</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Transactions récentes ───────────────────────────────────────── */}
      <Paper sx={{ p:3, borderRadius:2.5 }}>
        <Box sx={{ display:"flex", justifyContent:"space-between", alignItems:"center", mb:2 }}>
          <Box sx={{ display:"flex", alignItems:"center", gap:1 }}>
            <ReceiptLongIcon sx={{ color:"#64748B", fontSize:20 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color:"#0F172A" }}>Transactions récentes</Typography>
          </Box>
          <Button size="small" variant="outlined" onClick={() => router.push("/admin/transactions")}
            sx={{ borderRadius:1.5, fontSize:12 }}>Toutes</Button>
        </Box>
        {loading ? (
          <Box sx={{ display:"flex", justifyContent:"center", py:4 }}><CircularProgress size={24} sx={{ color:TEAL }} /></Box>
        ) : (
          <Box sx={{ overflowX:"auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ "& th":{ fontWeight:700, color:"#475569", fontSize:12, bgcolor:"#F8FAFC", border:0 } }}>
                  <TableCell>Date</TableCell><TableCell>Annonceur</TableCell><TableCell>Pays</TableCell>
                  <TableCell>Type</TableCell><TableCell>Provider</TableCell>
                  <TableCell align="right">Montant</TableCell><TableCell>Statut</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {txs.slice(0,12).map((t) => (
                  <TableRow key={t.id} hover sx={{ "&:last-child td":{ border:0 } }}>
                    <TableCell>
                      <Typography variant="caption" color="#64748B">
                        {new Date(t.created_at).toLocaleDateString("fr-FR")}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize:13 }}>{t.buyer_name||"—"}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.buyer_phone||t.buyer_email||""}</Typography>
                    </TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>{t.property_country||"—"}</Typography></TableCell>
                    <TableCell><Typography variant="caption">{PURPOSE_LABEL[t.purpose]||t.purpose}</Typography></TableCell>
                    <TableCell>
                      <Chip label={(t.provider||"—").toUpperCase()} size="small"
                        sx={{ bgcolor:pColor(t.provider)+"18", color:pColor(t.provider), fontWeight:700, fontSize:11, border:`1px solid ${pColor(t.provider)}33` }} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={700} sx={{ fontSize:13 }}>{formatFCFA(t.amount)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.status} size="small" color={STATUS_COLOR[t.status]||"default"} />
                    </TableCell>
                  </TableRow>
                ))}
                {txs.length===0 && (
                  <TableRow><TableCell colSpan={7} align="center" sx={{ py:4, color:"text.disabled" }}>Aucune transaction</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}
