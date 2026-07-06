import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Box, Typography, Grid, Avatar, Chip, Divider, CircularProgress,
} from "@mui/material";
import { PersonOutline } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import PropertyCard from "../../components/PropertyCard";
import { Sellers } from "../../lib/api";
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

export default function SellerProfile() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = router.query;

  const [seller, setSeller]     = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Sellers.get(id)
      .then(({ seller: s, listings: l }) => {
        setSeller(s);
        setListings(l || []);
      })
      .catch((err) => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
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
        boxShadow: 1, p: 3, mb: 4,
      }}>
        <Avatar sx={{ width: 72, height: 72, bgcolor: "primary.main", fontSize: 32 }}>
          {seller.full_name ? seller.full_name.charAt(0).toUpperCase() : <PersonOutline />}
        </Avatar>
        <Box>
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
          <Chip
            label={`${listings.length} annonce${listings.length > 1 ? "s" : ""} active${listings.length > 1 ? "s" : ""}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ mt: 0.5 }}
          />
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
                  {/* Adapter la shape pour PropertyCard */}
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
    </Layout>
  );
}
