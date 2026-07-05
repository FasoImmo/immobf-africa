import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Box, Button, Container, Grid, Paper, Typography, Chip, Divider, Alert, List, ListItem, ListItemIcon, ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

const EUR_RATE = 655.957;
const USD_RATE = 600;

const PLANS = [
  {
    months: 1,
    price: 2000,
    label: "1 mois",
    labelEn: "1 month",
    saving: null,
    popular: false,
  },
  {
    months: 3,
    price: 5500,
    label: "3 mois",
    labelEn: "3 months",
    saving: "−8%",
    popular: false,
  },
  {
    months: 6,
    price: 10000,
    label: "6 mois",
    labelEn: "6 months",
    saving: "−17%",
    popular: true,
  },
  {
    months: 12,
    price: 18000,
    label: "12 mois",
    labelEn: "12 months",
    saving: "−25%",
    popular: false,
  },
];

const FEATURES_FR = [
  "Annonce visible sur immoafrica.online",
  "Visible sur l'application mobile ImmoBF Africa",
  "Photos haute qualité (jusqu'à 10 photos)",
  "Géolocalisation sur la carte interactive",
  "Statistiques de vues et visiteurs",
  "Contact direct via WhatsApp",
  "Renouvellement à tout moment",
];

const FEATURES_EN = [
  "Listing visible on immoafrica.online",
  "Visible on the ImmoBF Africa mobile app",
  "High-quality photos (up to 10 photos)",
  "Geolocation on the interactive map",
  "Views and visitor statistics",
  "Direct contact via WhatsApp",
  "Renew at any time",
];

const TYPES_FR = [
  { icon: "🏠", label: "Maisons & villas" },
  { icon: "🏢", label: "Appartements" },
  { icon: "🏗️", label: "Terrains" },
  { icon: "🏬", label: "Bureaux & commerces" },
  { icon: "🔑", label: "Location longue durée" },
  { icon: "🌙", label: "Location courte durée" },
];

export default function PlansPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isEn = i18n.language === "en";

  const features = isEn ? FEATURES_EN : FEATURES_FR;

  return (
    <Layout>
      <Head>
        <title>{isEn ? "Subscription Plans — ImmoBF Africa" : "Offres d'abonnement — ImmoBF Africa"}</title>
        <meta
          name="description"
          content={isEn
            ? "Publish your real estate listing in Africa. Choose the plan that suits you."
            : "Publiez votre annonce immobilière en Afrique. Choisissez l'offre qui vous convient."
          }
        />
      </Head>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* ─── Hero ──────────────────────────────────────────────────── */}
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography variant="h3" fontWeight={800} color="primary" gutterBottom>
            🏠 {isEn ? "Publish your listing" : "Publiez votre annonce"}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
            {isEn
              ? "Reach thousands of buyers and tenants across Africa. Choose your subscription plan and publish in minutes."
              : "Atteignez des milliers d'acheteurs et locataires à travers l'Afrique. Choisissez votre offre et publiez en quelques minutes."
            }
          </Typography>
          <Alert severity="info" sx={{ mt: 3, maxWidth: 560, mx: "auto", textAlign: "left" }}>
            {isEn
              ? "A subscription is required to publish a listing. Payment is made securely via mobile money (Orange Money, Moov Money, Wave) or card."
              : "Un abonnement est requis pour publier une annonce. Le paiement s'effectue en toute sécurité via mobile money (Orange Money, Moov Money, Wave) ou par carte."
            }
          </Alert>
        </Box>

        {/* ─── Tarifs ────────────────────────────────────────────────── */}
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3, textAlign: "center" }}>
          {isEn ? "Choose your plan" : "Choisissez votre offre"}
        </Typography>
        <Grid container spacing={3} justifyContent="center" sx={{ mb: 6 }}>
          {PLANS.map((plan) => {
            const eur = (plan.price / EUR_RATE).toFixed(2);
            const usd = (plan.price / USD_RATE).toFixed(2);
            const pricePerMonth = Math.round(plan.price / plan.months);
            const label = isEn ? plan.labelEn : plan.label;

            return (
              <Grid item xs={12} sm={6} md={3} key={plan.months}>
                <Paper
                  elevation={plan.popular ? 6 : 2}
                  sx={{
                    p: 3, textAlign: "center", borderRadius: 3, position: "relative",
                    border: plan.popular ? "2px solid #0E7C66" : "2px solid transparent",
                    height: "100%", display: "flex", flexDirection: "column",
                  }}
                >
                  {plan.popular && (
                    <Chip
                      label={isEn ? "Most popular" : "Le plus populaire"}
                      color="success" size="small"
                      sx={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontWeight: 700 }}
                    />
                  )}
                  {plan.saving && (
                    <Chip
                      label={plan.saving}
                      color="warning" size="small"
                      sx={{ position: "absolute", top: 12, right: 12, fontWeight: 700, fontSize: 11 }}
                    />
                  )}
                  <Typography variant="h5" fontWeight={800} color="primary" sx={{ mt: plan.popular ? 1 : 0 }}>
                    {label}
                  </Typography>
                  <Typography variant="h4" fontWeight={900} sx={{ my: 1.5 }}>
                    {plan.price.toLocaleString("fr-FR")}
                    <Typography component="span" variant="body1" color="text.secondary"> FCFA</Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    ≈ {eur} € · ≈ ${usd}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {isEn
                      ? `≈ ${pricePerMonth.toLocaleString("fr-FR")} FCFA/month`
                      : `≈ ${pricePerMonth.toLocaleString("fr-FR")} FCFA/mois`
                    }
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2" sx={{ mb: 2, flexGrow: 1 }}>
                    {isEn
                      ? `Listing visible for ${plan.months * 30} days`
                      : `Annonce visible pendant ${plan.months * 30} jours`
                    }
                  </Typography>
                  <Button
                    variant={plan.popular ? "contained" : "outlined"}
                    color="primary" fullWidth size="large"
                    component={Link}
                    href={`/sell`}
                    sx={{ fontWeight: 700, borderRadius: 2 }}
                  >
                    {isEn ? "Publish" : "Publier"}
                  </Button>
                </Paper>
              </Grid>
            );
          })}
        </Grid>

        {/* ─── Ce qui est inclus ─────────────────────────────────────── */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                ✅ {isEn ? "What's included" : "Ce qui est inclus"}
              </Typography>
              <List dense>
                {features.map((f) => (
                  <ListItem key={f} disableGutters>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckCircleIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={f} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                🏗️ {isEn ? "Types of listings accepted" : "Types d'annonces acceptés"}
              </Typography>
              <Grid container spacing={1} sx={{ mt: 1 }}>
                {TYPES_FR.map((type) => (
                  <Grid item xs={6} key={type.label}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                      <Typography fontSize={20}>{type.icon}</Typography>
                      <Typography variant="body2">{type.label}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                {isEn
                  ? "All 55 African countries supported. Payment via Orange Money, Moov Money, Wave, FedaPay."
                  : "55 pays africains couverts. Paiement via Orange Money, Moov Money, Wave, FedaPay."
                }
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* ─── CTA final ─────────────────────────────────────────────── */}
        <Box sx={{ textAlign: "center", py: 4, px: 2, bgcolor: "primary.main", borderRadius: 4 }}>
          <Typography variant="h5" fontWeight={800} color="white" gutterBottom>
            {isEn ? "Ready to publish?" : "Prêt à publier ?"}
          </Typography>
          <Typography variant="body1" color="white" sx={{ mb: 3, opacity: 0.9 }}>
            {isEn
              ? "Create your listing in a few minutes and reach thousands of potential buyers."
              : "Créez votre annonce en quelques minutes et atteignez des milliers d'acheteurs potentiels."
            }
          </Typography>
          <Button
            variant="contained"
            size="large"
            component={Link}
            href="/sell"
            sx={{
              bgcolor: "white", color: "primary.main", fontWeight: 800,
              px: 5, py: 1.5, borderRadius: 3, fontSize: 18,
              "&:hover": { bgcolor: "#f0f0f0" },
            }}
          >
            {isEn ? "🚀 Start publishing" : "🚀 Commencer à publier"}
          </Button>
        </Box>
      </Container>
    </Layout>
  );
}
