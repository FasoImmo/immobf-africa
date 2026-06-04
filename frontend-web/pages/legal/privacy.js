import { Box, Container, Divider, Typography } from "@mui/material";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
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

export default function PrivacyPage() {
  const { t } = useTranslation();
  const p = (k) => t(`legal.privacy.${k}`);

  return (
    <Layout title="Politique de confidentialité — ImmoBF Africa">
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <PrivacyTipIcon sx={{ color: "#1B6B3A", fontSize: 32 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#1B6B3A" }}>
            Politique de confidentialité
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: "#888", mb: 4, fontStyle: "italic" }}>
          {p("version")}
        </Typography>

        <Section title={p("art9_title")}>
          <P>{p("art9_p1")} <strong>{EMAIL}</strong></P>
        </Section>

        <Section title={p("art10_title")}>
          <ul>
            <Li>{p("art10_li1")}</Li>
            <Li>{p("art10_li2")}</Li>
            <Li>{p("art10_li3")}</Li>
            <Li>{p("art10_li4")}</Li>
            <Li>{p("art10_li5")}</Li>
          </ul>
        </Section>

        <Section title={p("art11_title")}>
          <ul>
            <Li>{p("art11_li1")}</Li>
            <Li>{p("art11_li2")}</Li>
            <Li>{p("art11_li3")}</Li>
            <Li>{p("art11_li4")}</Li>
            <Li>{p("art11_li5")}</Li>
          </ul>
        </Section>

        <Section title={p("art12_title")}>
          <P>{p("art12_p1")}</P>
        </Section>

        <Section title={p("art13_title")}>
          <P>{p("art13_intro")} <strong>{EMAIL}</strong> :</P>
          <ul>
            <Li>{p("art13_li1")}</Li>
            <Li>{p("art13_li2")}</Li>
            <Li>{p("art13_li3")}</Li>
            <Li>{p("art13_li4")}</Li>
            <Li>{p("art13_li5")}</Li>
          </ul>
        </Section>

        <Section title={p("art14_title")}>
          <P>{p("art14_p1")}</P>
        </Section>

        <Section title={p("art15_title")}>
          <P>{p("art15_p1")}</P>
        </Section>
      </Container>
    </Layout>
  );
}
