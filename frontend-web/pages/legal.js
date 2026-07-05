import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Box, Typography, Tabs, Tab, Paper, Divider, Container
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Layout from "../components/Layout";

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

function CGU({ t }) {
  const c = (k) => t(`legal.cgu.${k}`);
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        {t("legal.version")}
      </Typography>
      <Section title={c("art1_title")}><P>{c("art1_p1")}</P><P>{c("art1_p2")}</P></Section>
      <Section title={c("art2_title")}>
        <ul><Li>{c("art2_li1")}</Li><Li>{c("art2_li2")}</Li><Li>{c("art2_li3")}</Li><Li>{c("art2_li4")}</Li></ul>
      </Section>
      <Section title={c("art3_title")}><P>{c("art3_p1")}</P></Section>
      <Section title={c("art4_title")}>
        <P>{c("art4_intro")}</P>
        <ul><Li>{c("art4_li1")}</Li><Li>{c("art4_li2")}</Li><Li>{c("art4_li3")}</Li><Li>{c("art4_li4")}</Li><Li>{c("art4_li5")}</Li></ul>
        <P sx={{ mt: 1 }}>{c("art4_p2")}</P>
      </Section>
      <Section title={c("art5_title")}>
        <P>{c("art5_intro")}</P>
        <ul><Li>{c("art5_li1")}</Li><Li>{c("art5_li2")}</Li><Li>{c("art5_li3")}</Li></ul>
      </Section>
      <Section title={c("art6_title")}><P>{c("art6_p1")}</P></Section>
      <Section title={c("art7_title")}><P>{c("art7_p1")}</P></Section>
      <Section title={c("art8_title")}>
        <P>{c("art8_p1")} <strong>{EMAIL}</strong></P>
      </Section>
    </Box>
  );
}

function Confidentialite({ t }) {
  const p = (k) => t(`legal.privacy.${k}`);
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        {p("version")}
      </Typography>
      <Section title={p("art9_title")}><P>{p("art9_p1")} <strong>{EMAIL}</strong></P></Section>
      <Section title={p("art10_title")}>
        <ul><Li>{p("art10_li1")}</Li><Li>{p("art10_li2")}</Li><Li>{p("art10_li3")}</Li><Li>{p("art10_li4")}</Li><Li>{p("art10_li5")}</Li></ul>
      </Section>
      <Section title={p("art11_title")}>
        <ul><Li>{p("art11_li1")}</Li><Li>{p("art11_li2")}</Li><Li>{p("art11_li3")}</Li><Li>{p("art11_li4")}</Li><Li>{p("art11_li5")}</Li></ul>
      </Section>
      <Section title={p("art12_title")}><P>{p("art12_p1")}</P></Section>
      <Section title={p("art13_title")}>
        <P>{p("art13_intro")} <strong>{EMAIL}</strong> :</P>
        <ul><Li>{p("art13_li1")}</Li><Li>{p("art13_li2")}</Li><Li>{p("art13_li3")}</Li><Li>{p("art13_li4")}</Li><Li>{p("art13_li5")}</Li></ul>
      </Section>
      <Section title={p("art14_title")}><P>{p("art14_p1")}</P></Section>
      <Section title={p("art15_title")}><P>{p("art15_p1")}</P></Section>
    </Box>
  );
}

function NonResponsabilite({ t }) {
  const d = (k) => t(`legal.disclaimer.${k}`);
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        {d("version")}
      </Typography>
      <Section title={d("art16_title")}><P>{d("art16_p1")}</P></Section>
      <Section title={d("art17_title")}>
        <P>{d("art17_intro")}</P>
        <ul><Li>{d("art17_li1")}</Li><Li>{d("art17_li2")}</Li><Li>{d("art17_li3")}</Li><Li>{d("art17_li4")}</Li></ul>
      </Section>
      <Section title={d("art18_title")}>
        <P>{d("art18_intro")}</P>
        <ul><Li>{d("art18_li1")}</Li><Li>{d("art18_li2")}</Li><Li>{d("art18_li3")}</Li><Li>{d("art18_li4")}</Li></ul>
      </Section>
      <Section title={d("art19_title")}>
        <P>{d("art19_intro")}</P>
        <ul><Li>{d("art19_li1")}</Li><Li>{d("art19_li2")}</Li><Li>{d("art19_li3")}</Li></ul>
      </Section>
      <Section title={d("art20_title")}><P>{d("art20_p1")}</P></Section>
      <Section title={d("art21_title")}><P>{d("art21_p1")}</P></Section>
      <Section title={d("art22_title")}><P>{d("art22_p1")} <strong>{EMAIL}</strong></P></Section>
    </Box>
  );
}

export default function Legal() {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  return (
    <Layout title={`${t("legal.title")} — ImmoBF Africa`}>
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#1B6B3A" }}>
          {t("legal.title")}
        </Typography>
        <Typography variant="body2" sx={{ color: "#888", mb: 3 }}>
          {t("legal.subtitle")}
        </Typography>

        <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}
          >
            <Tab label={t("legal.tab_cgu")} icon={<GavelIcon fontSize="small" />} iconPosition="start" />
            <Tab label={t("legal.tab_privacy")} icon={<PrivacyTipIcon fontSize="small" />} iconPosition="start" />
            <Tab label={t("legal.tab_disclaimer")} icon={<WarningAmberIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
          <Box sx={{ p: { xs: 2, md: 4 } }}>
            {tab === 0 && <CGU t={t} />}
            {tab === 1 && <Confidentialite t={t} />}
            {tab === 2 && <NonResponsabilite t={t} />}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
