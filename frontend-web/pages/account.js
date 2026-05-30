import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Card, CardContent, CardMedia, CardActions,
  Button, Chip, Alert, CircularProgress, Divider, Paper, Stack,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import { Analytics } from "../lib/api";
import api from "../lib/api";
import { formatFCFA } from "../lib/format";

const EUR_RATE = 655.957;
const USD_RATE = 600;
const LISTING_FEE = 2000;

function SubscriptionBadge({ status, daysRemaining }) {
  if (status === "active") {
    return (
      <Chip
        size="small" color="success"
        label={`Actif — ${daysRemaining}j restants`}
      />
    );
  }
  if (status === "expiring_soon") {
    return (
      <Chip
        size="small" color="warning"
        label={`Expire dans ${daysRemaining}j`}
      />
    );
  }
  if (status === "expired") {
    return <Chip size="small" color="error" label="Expiré — annonce masquée" />;
  }
  return <Chip size="small" color="default" label="Aucun abonnement" />;
}

export default function AccountPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("immobf_user");
    const token = localStorage.getItem("immobf_token");
    if (!stored || !token) { router.replace("/login?redirect=/account"); return; }
    setUser(JSON.parse(stored));

    Analytics.myStats()
      .then((r) => setListings(r.listings || []))
      .catch(() => setErr("Impossible de charger vos annonces."))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  function renew(propertyId) {
    router.push(`/sell?renew=${propertyId}`);
  }

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.subscription_status === "active").length,
    expiring: listings.filter((l) => l.subscription_status === "expiring_soon").length,
    expired: listings.filter((l) => l.subscription_status === "expired").length,
  };

  return (
    <Layout title="Mon compte — ImmoBF Africa">
      <Typography variant="h4" gutterBottom>Mon compte</Typography>

      {user && (
        <Paper elevation={0} sx={{ p: 2, mb: 3, bgcolor: "#f5f5f5", borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={600}>{user.full_name || user.phone}</Typography>
          <Typography variant="body2" color="text.secondary">{user.phone}</Typography>
        </Paper>
      )}

      {/* Résumé abonnements */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Annonces totales", value: stats.total, color: "primary.main" },
          { label: "Actives", value: stats.active, color: "success.main" },
          { label: "Expirent bientôt", value: stats.expiring, color: "warning.main" },
          { label: "Expirées", value: stats.expired, color: "error.main" },
        ].map((s) => (
          <Grid item xs={6} sm={3} key={s.label}>
            <Paper elevation={1} sx={{ p: 2, textAlign: "center" }}>
              <Typography variant="h4" color={s.color}>{s.value}</Typography>
              <Typography variant="caption" color="text.secondary">{s.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5">Mes annonces</Typography>
        <Button variant="contained" component={Link} href="/sell">
          + Nouvelle annonce
        </Button>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && listings.length === 0 && (
        <Alert severity="info">
          Vous n'avez pas encore d'annonce.{" "}
          <Link href="/sell" style={{ color: "#0E7C66" }}>Publiez votre première annonce</Link>.
        </Alert>
      )}

      <Grid container spacing={2}>
        {listings.map((p) => {
          const cover = p.photos?.[0]?.url || `https://picsum.photos/seed/${p.id}/400/250`;
          const isExpiringSoon = p.subscription_status === "expiring_soon";
          const isExpired = p.subscription_status === "expired";

          return (
            <Grid item xs={12} sm={6} md={4} key={p.id}>
              <Card elevation={2} sx={{ opacity: isExpired ? 0.7 : 1 }}>
                <CardMedia component="img" height="140" image={cover} alt={p.title} />
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="subtitle2" noWrap>{p.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {p.city} · {formatFCFA(p.price, p.currency)}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
                    <SubscriptionBadge
                      status={p.subscription_status}
                      daysRemaining={p.days_remaining}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      👁 {p.total_views || 0} vues
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      👤 {p.unique_visitors || 0} visiteurs uniques
                    </Typography>
                    <Typography variant="caption" color="success.main">
                      💬 {p.whatsapp_clicks || 0} contacts WhatsApp
                    </Typography>
                  </Box>
                  {Number(p.views_7d) > 0 && (
                    <Typography variant="caption" color="primary.main">
                      +{p.views_7d} vues cette semaine
                    </Typography>
                  )}
                  {p.listing_expires_at && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Expire le {new Date(p.listing_expires_at).toLocaleDateString("fr-FR")}
                    </Typography>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: "space-between", px: 2 }}>
                  <Button size="small" component={Link} href={`/properties/${p.id}`}>
                    Voir
                  </Button>
                  {(isExpiringSoon || isExpired) && (
                    <Button
                      size="small" variant="contained" color="warning"
                      onClick={() => renew(p.id)}
                    >
                      Renouveler — {LISTING_FEE.toLocaleString("fr-FR")} FCFA
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, opacity: 0.8 }}>
                        (≈ {(LISTING_FEE / EUR_RATE).toFixed(2)}€)
                      </Typography>
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Layout>
  );
}
