import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Avatar, Chip, Divider, CircularProgress,
  Rating, Paper,
} from "@mui/material";
import { PersonOutline } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PropertyCard from "../../components/PropertyCard";
import { Sellers, Reviews } from "../../lib/api";
import { AFRICAN_COUNTRIES } from "../../lib/africanCountries";

const TX_LABEL = {
  sale:       "Vente",
  rent_long:  "Location longue durée",
  rent_short: "Location courte durée",
};

function countryName(code) {
  const found = AFRICAN_COUNTRIES.find((c) => c.code === code);
  return found ? `${found.flag} ${found.name}` : code;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 30)  return `il y a ${days} jours`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

export default function SellerProfile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;

  const [seller, setSeller]     = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [reviews, setReviews]   = useState([]);
  const [reviewStats, setReviewStats] = useState({ avg_rating: 0, total_reviews: 0 });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Sellers.get(id)
      .then(({ seller: s, listings: l }) => {
        setSeller(s);
        setListings(l || []);
        // avg_rating + total_reviews sont déjà dans la réponse seller
        if (s.avg_rating !== undefined) {
          setReviewStats({ avg_rating: s.avg_rating, total_reviews: s.total_reviews });
        }
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));

    // Charger les avis séparément (liste paginée)
    Reviews.forSeller(id, { limit: 10 })
      .then(({ reviews: r, stats }) => {
        setReviews(r || []);
        if (stats) setReviewStats(stats);
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return (
      <Layout title="Profil annonceur — ImmoBF">
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (notFound || !seller) {
    return (
      <Layout title="Annonceur introuvable — ImmoBF">
        <Typography variant="h5" sx={{ mt: 6, textAlign: "center" }}>
          Annonceur introuvable.
        </Typography>
        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Link href="/properties">← Retour aux annonces</Link>
        </Box>
      </Layout>
    );
  }

  const memberSince = new Date(seller.created_at).toLocaleDateString("fr-FR", {
    month: "long", year: "numeric",
  });

  // Regrouper par type de transaction pour l'affichage
  const byTx = listings.reduce((acc, p) => {
    const k = p.transaction_type || "sale";
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  return (
    <Layout title={`${seller.full_name || "Annonceur"} — ImmoBF`}>
      {/* ─── En-tête profil ─────────────────────────────────────────────────── */}
      <Box sx={{
        display: "flex", alignItems: "center", gap: 3,
        bgcolor: "background.paper", borderRadius: 3,
        boxShadow: 1, p: 3, mb: 4, flexWrap: "wrap",
      }}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main", fontSize: 32 }}>
          {seller.full_name ? seller.full_name.charAt(0).toUpperCase() : <PersonOutline />}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            {seller.full_name || "Annonceur"}
          </Typography>
          {seller.country_code && (
            <Typography variant="body2" color="text.secondary">
              {countryName(seller.country_code)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            Membre depuis {memberSince}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5, alignItems: "center" }}>
            <Chip
              label={`${listings.length} annonce${listings.length > 1 ? "s" : ""} active${listings.length > 1 ? "s" : ""}`}
              size="small" color="primary" variant="outlined"
            />
            {reviewStats.total_reviews > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Rating value={Number(reviewStats.avg_rating)} precision={0.1} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  {Number(reviewStats.avg_rating).toFixed(1)} ({reviewStats.total_reviews} avis)
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ─── Annonces ───────────────────────────────────────────────────────── */}
      {listings.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
          Cet annonceur n&apos;a pas d&apos;annonces actives pour le moment.
        </Typography>
      ) : (
        Object.entries(byTx).map(([tx, items]) => (
          <Box key={tx} sx={{ mb: 4 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {TX_LABEL[tx] || tx}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              {items.map((p) => (
                <Grid item xs={12} sm={6} md={4} key={p.id}>
                  <PropertyCard property={{
                    ...p,
                    photos: p.cover_photo ? [{ photo_url: p.cover_photo }] : [],
                    location: (p.lat && p.lng) ? { lat: p.lat, lng: p.lng } : null,
                  }} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ))
      )}

      {/* ─── Avis reçus ─────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            ⭐ Avis ({reviewStats.total_reviews})
          </Typography>
          {reviewStats.total_reviews > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {Number(reviewStats.avg_rating).toFixed(1)}
              </Typography>
              <Box>
                <Rating value={Number(reviewStats.avg_rating)} precision={0.1} readOnly />
                <Typography variant="caption" color="text.secondary">
                  sur {reviewStats.total_reviews} avis
                </Typography>
              </Box>
            </Box>
          )}
          <Grid container spacing={2}>
            {reviews.map((r) => (
              <Grid item xs={12} sm={6} md={4} key={r.id}>
                <Paper elevation={0} sx={{ p: 2.5, border: "1px solid #e0e0e0", borderRadius: 3, height: "100%" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: "grey.400", fontSize: 14 }}>
                        {r.reviewer_name?.charAt(0).toUpperCase() || "?"}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
                        {r.reviewer_name || "Utilisateur"}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {timeAgo(r.created_at)}
                    </Typography>
                  </Box>
                  <Rating value={r.rating} readOnly size="small" sx={{ mb: 1 }} />
                  {r.property_title && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      <Link href={`/properties/${r.property_id}`} style={{ color: "#0E7C66" }}>
                        {r.property_title.length > 50 ? r.property_title.slice(0, 48) + "…" : r.property_title}
                      </Link>
                    </Typography>
                  )}
                  {r.comment && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: "italic" }}>
                      &ldquo;{r.comment}&rdquo;
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Layout>
  );
}
