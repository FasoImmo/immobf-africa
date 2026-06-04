import { Box, Button, Container, Divider, Paper, Typography } from "@mui/material";
import CookieIcon from "@mui/icons-material/Cookie";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import Layout from "../../components/Layout";
import Link from "next/link";

function Section({ title, children }) {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "#1B6B3A", mb: 1 }}>
        {title}
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Box>
  );
}

function P({ children }) {
  return (
    <Typography variant="body2" sx={{ mb: 1.5, color: "#444", lineHeight: 1.8, textAlign: "justify" }}>
      {children}
    </Typography>
  );
}

function CookieRow({ name, purpose, duration, required }) {
  return (
    <Box sx={{ display: "flex", gap: 2, py: 1.5, borderBottom: "1px solid #f0f0f0", flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 160 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "monospace", color: "#1B6B3A" }}>
          {name}
        </Typography>
        <Typography variant="caption" sx={{ color: required ? "#E0A500" : "#aaa" }}>
          {required ? "Strictement nécessaire" : "Analytique"}
        </Typography>
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ color: "#444" }}>{purpose}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "#888", minWidth: 80, textAlign: "right" }}>{duration}</Typography>
    </Box>
  );
}

export default function CookiesPage() {
  return (
    <Layout title="Politique cookies — ImmoBF Africa">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <CookieIcon sx={{ color: "#1B6B3A", fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B6B3A" }}>
            Politique relative aux cookies
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#888", mb: 4, fontStyle: "italic" }}>
          Version 1.0 — 4 juin 2026 — ImmoBF Africa / immoafrica.online
        </Typography>

        <Section title="1. Qu'est-ce qu'un cookie ?">
          <P>
            Un cookie est un petit fichier texte déposé sur votre appareil lors de la visite d'un site web.
            Il permet au site de mémoriser vos préférences et d'assurer le bon fonctionnement de certaines fonctionnalités.
          </P>
        </Section>

        <Section title="2. Cookies que nous utilisons">
          <P>ImmoBF Africa utilise uniquement des cookies <strong>strictement nécessaires</strong> au fonctionnement de la plateforme. Aucun cookie publicitaire, de traçage tiers ou de profilage n'est déposé.</P>

          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden", mt: 2 }}>
            <Box sx={{ px: 2, py: 1.5, backgroundColor: "#f9f9f9", borderBottom: "1px solid #eee" }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Nom du cookie · Finalité · Durée
              </Typography>
            </Box>
            <Box sx={{ px: 2 }}>
              <CookieRow
                name="immobf_token"
                purpose="Authentification — maintient votre session après connexion."
                duration="15 min"
                required
              />
              <CookieRow
                name="immobf_refresh"
                purpose="Renouvellement automatique de la session sans reconnexion."
                duration="30 jours"
                required
              />
              <CookieRow
                name="immobf_lang"
                purpose="Mémorise votre préférence de langue (FR, EN, Mooré, Dioula)."
                duration="1 an"
                required
              />
              <CookieRow
                name="immobf_cookie_consent"
                purpose="Mémorise votre choix concernant le bandeau de consentement."
                duration="1 an"
                required
              />
            </Box>
          </Paper>
        </Section>

        <Section title="3. Cookies tiers">
          <P>
            Notre plateforme ne charge aucun script publicitaire tiers. Les prestataires de paiement
            (FedaPay, Orange Money, Moov Money) peuvent déposer leurs propres cookies lors des redirections
            vers leurs pages de paiement — ces cookies sont régis par leurs politiques respectives.
          </P>
        </Section>

        <Section title="4. Gestion de votre consentement">
          <P>
            Conformément aux recommandations de l'<strong>Autorité de Protection des Données Personnelles (APDP)</strong> du Burkina Faso,
            vous pouvez à tout moment modifier votre choix en cliquant sur les boutons ci-dessous.
          </P>

          <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("immobf_cookie_consent", "accepted");
                  window.dispatchEvent(new Event("cookie_consent_update"));
                }
              }}
              sx={{ backgroundColor: "#1B6B3A", "&:hover": { backgroundColor: "#145530" } }}
            >
              Accepter les cookies nécessaires
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelOutlinedIcon />}
              onClick={() => {
                if (typeof window !== "undefined") {
                  localStorage.setItem("immobf_cookie_consent", "refused");
                  window.dispatchEvent(new Event("cookie_consent_update"));
                }
              }}
              color="inherit"
            >
              Refuser les cookies non essentiels
            </Button>
          </Box>
          <Typography variant="caption" sx={{ color: "#aaa", mt: 1, display: "block" }}>
            Note : refuser les cookies strictement nécessaires empêche la connexion à votre compte.
          </Typography>
        </Section>

        <Section title="5. Contact">
          <P>
            Pour toute question sur notre utilisation des cookies ou pour exercer vos droits, contactez-nous à{" "}
            <strong>legal@immoafrica.online</strong> ou consultez notre{" "}
            <Link href="/legal/privacy" style={{ color: "#1B6B3A" }}>
              politique de confidentialité
            </Link>.
          </P>
        </Section>
      </Container>
    </Layout>
  );
}
