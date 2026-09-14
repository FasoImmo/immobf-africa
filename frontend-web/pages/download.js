import Head from "next/head";
import Link from "next/link";
import { Box, Button, Container, Divider, Grid, Paper, Typography, Chip } from "@mui/material";
import AndroidIcon from "@mui/icons-material/Android";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";

// Android : Google Play (alpha / bêta → production dès validation)
const ANDROID_URL = process.env.NEXT_PUBLIC_ANDROID_URL || "https://play.google.com/store/apps/details?id=africa.immobf.app";
const ANDROID_TESTING_URL = "https://play.google.com/apps/testing/africa.immobf.app";

// iOS : App Store (disponible dès validation Apple — soumis sept. 2026)
const IOS_URL = process.env.NEXT_PUBLIC_IOS_URL || "https://apps.apple.com/app/id6809453557";

// Rétrocompatibilité (ancienne variable Vercel inutilisée — ne pas supprimer avant déploiement)
const APK_URL = ANDROID_URL;

export default function DownloadPage() {
  const { t } = useTranslation();

  const FEATURES = [
    { icon: "🔍", title: t("download.feat_search_title"), desc: t("download.feat_search_desc") },
    { icon: "📸", title: t("download.feat_photos_title"), desc: t("download.feat_photos_desc") },
    { icon: "💸", title: t("download.feat_payment_title"), desc: t("download.feat_payment_desc") },
    { icon: "📴", title: t("download.feat_offline_title"), desc: t("download.feat_offline_desc") },
    { icon: "🔔", title: t("download.feat_alerts_title"), desc: t("download.feat_alerts_desc") },
    { icon: "🌍", title: t("download.feat_multi_title"), desc: t("download.feat_multi_desc") },
  ];

  const STEPS = [
    { n: "1", text: t("download.step1") },
    { n: "2", text: t("download.step2") },
    { n: "3", text: t("download.step3") },
    { n: "4", text: t("download.step4") },
  ];

  return (
    <Layout title={t("download.page_title")}>
      <Head>
        <meta name="description" content={t("download.hero_desc")} />
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
          {t("download.hero_subtitle")}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.8, mb: 4, maxWidth: 500, mx: "auto" }}>
          {t("download.hero_desc")}
        </Typography>

        <Box sx={{ display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<AndroidIcon />}
            href={ANDROID_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              bgcolor: "white", color: "#0E7C66", fontWeight: 700,
              px: 4, py: 1.5,
              "&:hover": { bgcolor: "#f0f0f0" },
            }}
          >
            Google Play
          </Button>
          <Button
            variant="outlined"
            size="large"
            startIcon={<PhoneIphoneIcon />}
            href={IOS_URL}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              borderColor: "rgba(255,255,255,0.5)", color: "white",
              px: 4, py: 1.5,
              "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            App Store (iOS)
          </Button>
        </Box>

        <Box sx={{ mt: 3, display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
          <Chip label="Android 8+" size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
          <Chip label="v1.5.1" size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
          <Chip label={t("download.chip_free")} size="small" sx={{ bgcolor: "rgba(255,255,255,0.15)", color: "white" }} />
        </Box>
      </Box>

      {/* Fonctionnalités */}
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        {t("download.section_features")}
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
        {t("download.features_subtitle")}
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
            {t("download.section_install")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {t("download.install_note")}
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

          <Box sx={{ mt: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<AndroidIcon />}
              href={ANDROID_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ px: 4, py: 1.5, fontWeight: 700 }}
            >
              Google Play (Android)
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<PhoneIphoneIcon />}
              href={IOS_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ px: 4, py: 1.5, fontWeight: 700 }}
            >
              App Store (iOS)
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{
            p: 4, borderRadius: 3,
            background: "linear-gradient(135deg,#f5f5f5,#e8f5e9)",
            textAlign: "center",
          }} elevation={0}>
            <Typography fontSize={80} gutterBottom>📱</Typography>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {t("download.card_title")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {t("download.card_desc")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("download.card_note")}
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
          {t("download.cta_title")}
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 3 }}>
          {t("download.cta_desc")}
        </Typography>
        <Button
          variant="contained"
          size="large"
          component={Link}
          href="/"
          sx={{ bgcolor: "white", color: "#0E7C66", fontWeight: 700, px: 4, "&:hover": { bgcolor: "#f0f0f0" } }}
        >
          {t("download.cta_btn")}
        </Button>
      </Paper>
    </Layout>
  );
}
