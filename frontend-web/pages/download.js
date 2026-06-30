import Head from "next/head";
import Link from "next/link";
import { Box, Button, Container, Divider, Grid, Paper, Typography, Chip } from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import Layout from "../components/Layout";

const APK_URL = process.env.NEXT_PUBLIC_APK_URL || "https://github.com/FasoImmo/immobf-africa/releases/latest/download/immobf-africa.apk";

const FEATURES = [
  { icon: "🔍", title: "Recherche avancée", desc: "Filtrez par pays, ville, type de bien et budget." },
  { icon: "📸", title: "Photos haute qualité", desc: "Consultez les annonces avec toutes leurs photos." },
  { icon: "💸", title: "Paiement mobile money", desc: "Payez via Moov Money, Orange Money ou Wave." },
  { icon: "📴", title: "Mode hors-ligne", desc: "Consultez les dernières annonces même sans connexion." },
  { icon: "🔔", title: "Alertes personnalisées", desc: "Recevez les nouvelles annonces selon vos critères." },
  { icon: "🌍", title: "Multi-pays", desc: "BF, CI, SN, ML, TG, BJ, NE et toute l'Afrique." },
];

const STEPS = [
  { n: "1", text: "Cliquez sur « Télécharger APK » ci-dessous" },
  { n: "2", text: "Ouvrez le fichier téléchargé sur votre téléphone" },
  { n: "3", text: "Autorisez l'installation depuis des sources inconnues si demandé" },
  { n: "4", text: "Installez et ouvrez ImmoBF Africa" },
];

export default function DownloadPage() {
  return (
    <Layout title="Télécharger l'app — ImmoBF Africa">
      <Head>
        <meta name="description" content="Téléchargez l'application ImmoBF Africa sur Android. Recherchez, achetez ou louez des biens immobiliers au Burkina Faso et en Afrique de l'Ouest." />
      </Head>

      {/* Hero */}
      <Box sx={{
        textAlign: "center", py: { xs: 6, md: 8 },
        background: "linear-gradient(135deg,#0E7C66,#13a48c)",
        color: "white", borderRadius: 3, mb: 6, px: 3,
      }}>
        <Typography variant="h3" fontWeight={700} gutterBottom sx={{ fontSize: { xs: "2rem", md: "3rem" } }}>
          ImmoBF Africa
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, mb: 1 }}>
          L'immobilier africain dans votre poche
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, mb: 4, maxWidth: 500, mx: "auto" }}>
          Achetez, vendez ou louez des biens au Burkina Faso et dans toute l'Afrique de l'Ouest.
          Paiements mobile money intégrés.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AndroidIcon />}
            href={APK_URL}
            sx={{
              bgcolor: "white", color: "#0E7C66", fontWeight: 700,
              px: 4, py: 1.5,
              "&:hover": { bgcolor: "#f0f0f0" },
            }}
          >
            Télécharger APK Android
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PhoneIphoneIcon />}
            disabled
            sx={{
              borderColor: "rgba(255,255,255,0.5)", color: "white",
              px: 4, py: 1.5,
              "&.Mui-disabled": { borderColor: "rgba(255,255,255,0.3)", color: "rgba(255,255,255,0.5)" },
            }}
          >
            iOS — Bientôt disponible
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
          <Chip label="Android 8+" size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
          <Chip label="v1.0.0" size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
          <Chip label="Gratuit" size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
        </Box>
      </Box>

      {/* Fonctionnalités */}
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        Tout ce dont vous avez besoin
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        Une app légère, rapide, conçue pour les connexions africaines.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {FEATURES.map((f) => (
          <Grid item xs={12} sm={6} md={4} key={f.title}>
            <Paper sx={{ p: 3, height: "100%", borderRadius: 2 }} elevation={1}>
              <Typography fontSize={32} gutterBottom>{f.icon}</Typography>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>{f.title}</Typography>
              <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 6 }} />

      {/* Instructions installation */}
      <Grid container spacing={6} alignItems="center">
        <Grid item xs={12} md={6}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Comment installer l'APK ?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            L'app n'est pas encore sur le Play Store — l'installation directe via APK est rapide et sécurisée.
          </Typography>

          {STEPS.map((step) => (
            <Box key={step.n} sx={{ display: "flex", gap: 2, mb: 2, alignItems: "flex-start" }}>
              <Box sx={{
                width: 32, height: 32, borderRadius: "50%",
                bgcolor: "#0E7C66", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, flexShrink: 0, fontSize: 14,
              }}>
                {step.n}
              </Box>
              <Typography variant="body1" sx={{ pt: 0.5 }}>{step.text}</Typography>
            </Box>
          ))}

          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AndroidIcon />}
            href={APK_URL}
            sx={{ mt: 3, px: 4, py: 1.5, fontWeight: 700 }}
          >
            Télécharger maintenant (APK)
          </Button>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{
            p: 4, borderRadius: 3,
            background: "linear-gradient(135deg,#f5f5f5,#e8f5e9)",
            textAlign: "center",
          }} elevation={0}>
            <Typography fontSize={80} gutterBottom>📱</Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Application mobile
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Disponible sur Android dès maintenant.
              Version iOS en cours de développement.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Nécessite Android 8.0 (Oreo) ou supérieur · ~25 MB
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 6 }} />

      {/* CTA vers le site web */}
      <Paper elevation={0} sx={{
        p: 4, textAlign: "center", borderRadius: 3,
        background: "linear-gradient(135deg,#0E7C66,#13a48c)", color: "white",
      }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          Préférez-vous utiliser le site web ?
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
          Toutes les fonctionnalités sont aussi disponibles sur immoafrica.online
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/"
          sx={{ bgcolor: "white", color: "#0E7C66", fontWeight: 700, px: 4, "&:hover": { bgcolor: "#f0f0f0" } }}
        >
          Accéder au site →
        </Button>
      </Paper>
    </Layout>
  );
}
