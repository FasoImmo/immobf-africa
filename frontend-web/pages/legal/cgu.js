import { Box, Container, Divider, Typography } from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import Layout from "../../components/Layout";
import { useTranslation } from "react-i18next";

const EMAIL = "legal@immoafrica.online";

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

function Li({ children }) {
  return (
    <Typography component="li" variant="body2" sx={{ mb: 0.5, color: "#444", lineHeight: 1.8, ml: 2 }}>
      {children}
    </Typography>
  );
}

export default function CGUPage() {
  const { t } = useTranslation();
  const c = (k) => t(`legal.cgu.${k}`);

  return (
    <Layout title="Conditions Générales d'Utilisation — ImmoBF Africa">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <GavelIcon sx={{ color: "#1B6B3A", fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B6B3A" }}>
            Conditions Générales d'Utilisation
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#888", mb: 4, fontStyle: "italic" }}>
          {t("legal.version")}
        </Typography>

        <Section title={c("art1_title")}>
          <P>{c("art1_p1")}</P>
          <P>{c("art1_p2")}</P>
        </Section>

        <Section title={c("art2_title")}>
          <ul>
            <Li>{c("art2_li1")}</Li>
            <Li>{c("art2_li2")}</Li>
            <Li>{c("art2_li3")}</Li>
            <Li>{c("art2_li4")}</Li>
          </ul>
        </Section>

        <Section title={c("art3_title")}>
          <P>{c("art3_p1")}</P>
        </Section>

        <Section title={c("art4_title")}>
          <P>{c("art4_intro")}</P>
          <ul>
            <Li>{c("art4_li1")}</Li>
            <Li>{c("art4_li2")}</Li>
            <Li>{c("art4_li3")}</Li>
            <Li>{c("art4_li4")}</Li>
            <Li>{c("art4_li5")}</Li>
          </ul>
          <P>{c("art4_p2")}</P>
        </Section>

        <Section title={c("art5_title")}>
          <P>{c("art5_intro")}</P>
          <ul>
            <Li>{c("art5_li1")}</Li>
            <Li>{c("art5_li2")}</Li>
            <Li>{c("art5_li3")}</Li>
          </ul>
        </Section>

        <Section title={c("art6_title")}>
          <P>{c("art6_p1")}</P>
          <P>{c("art6_p2")}</P>
        </Section>

        <Section title={c("art7_title")}>
          <P>{c("art7_p1")}</P>
        </Section>

        <Section title={c("art8_title")}>
          <P>
            {c("art8_p1")} <strong>{EMAIL}</strong>
          </P>
        </Section>
      </Container>
    </Layout>
  );
}
