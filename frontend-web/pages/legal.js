import { useState } from "react";
import {
  Box, Typography, Tabs, Tab, Paper, Divider, Container
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import PrivacyTipIcon from "@mui/icons-material/PrivacyTip";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Layout from "../components/Layout";

const DATE = "12 mai 2026";
const EMAIL = "legal@immobf.africa";
const SITE = "https://immobf-frontend.vercel.app";

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

// ─────────────────────────────────────────────
// CGU
// ─────────────────────────────────────────────
function CGU() {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        Version 1.0 — Entrée en vigueur : {DATE} — Droit applicable : Burkina Faso / OHADA / BCEAO
      </Typography>

      <Section title="Article 1 — Objet et champ d'application">
        <P>
          Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'accès et l'utilisation
          de la plateforme ImmoBF Africa, accessible à l'adresse {SITE}.
          ImmoBF Africa est une place de marché numérique mettant en relation des annonceurs immobiliers
          et des visiteurs. L'éditeur n'agit pas en qualité d'agent immobilier, de mandataire ou
          d'intermédiaire financier réglementé.
        </P>
        <P>Toute utilisation de la plateforme vaut acceptation pleine et entière des présentes CGU.</P>
      </Section>

      <Section title="Article 2 — Définitions">
        <ul>
          <Li>« Utilisateur » : toute personne accédant à la plateforme, inscrite ou non.</Li>
          <Li>« Annonceur » : Utilisateur publiant une annonce immobilière.</Li>
          <Li>« Visiteur » : Utilisateur consultant les annonces.</Li>
          <Li>« Transaction » : tout paiement initié via la plateforme (dépôt, escrow, acompte).</Li>
        </ul>
      </Section>

      <Section title="Article 3 — Accès et sécurité du compte">
        <P>
          L'accès est réservé aux personnes majeures (18 ans ou plus). L'Utilisateur est seul responsable
          de la confidentialité de ses identifiants. Toute utilisation du compte consécutive à une
          négligence dans la conservation des identifiants engage la seule responsabilité de l'Utilisateur.
          L'éditeur ne saurait être tenu responsable d'un accès non autorisé résultant de cette négligence.
        </P>
      </Section>

      <Section title="Article 4 — Obligations des Annonceurs">
        <P>L'Annonceur s'engage à :</P>
        <ul>
          <Li>Publier des informations exactes, complètes et à jour sur les biens proposés.</Li>
          <Li>Être propriétaire du bien ou disposer d'un mandat régulier et vérifiable.</Li>
          <Li>Ne pas publier d'annonces frauduleuses, trompeuses ou relatives à des biens fictifs.</Li>
          <Li>Ne pas utiliser la plateforme à des fins illicites (blanchiment, financement du terrorisme).</Li>
          <Li>Retirer ou mettre à jour toute annonce dont les informations sont devenues inexactes.</Li>
        </ul>
        <P>
          Le non-respect de ces obligations engage la responsabilité exclusive de l'Annonceur et peut
          entraîner la suppression immédiate du compte sans indemnité.
        </P>
      </Section>

      <Section title="Article 5 — Obligations des Visiteurs">
        <P>Le Visiteur s'engage à :</P>
        <ul>
          <Li>Vérifier la situation juridique du bien (titre foncier, servitudes, hypothèques) avant tout engagement.</Li>
          <Li>Consulter un notaire ou expert compétent avant toute transaction immobilière.</Li>
          <Li>Ne pas contacter les Annonceurs à des fins autres que l'acquisition ou la location du bien.</Li>
        </ul>
      </Section>

      <Section title="Article 6 — Paiements et escrow">
        <P>
          La plateforme propose un mécanisme de séquestre (escrow) à titre de facilité. Ce mécanisme
          ne constitue pas une garantie bancaire au sens de la réglementation BCEAO. Les paiements sont
          traités par des prestataires tiers (FedaPay, Orange Money, Moov Money, Wave) dont les conditions
          propres s'appliquent. L'éditeur décline toute responsabilité pour tout incident imputable à ces
          prestataires.
        </P>
      </Section>

      <Section title="Article 7 — Propriété intellectuelle">
        <P>
          L'ensemble des éléments de la plateforme (logo, interface, code, textes, design) est la propriété
          exclusive de l'éditeur et protégé par le droit burkinabé sur la propriété intellectuelle.
          Toute reproduction non autorisée constitue une contrefaçon.
        </P>
      </Section>

      <Section title="Article 8 — Droit applicable et juridiction compétente">
        <P>
          Les présentes CGU sont soumises au droit burkinabé, complété par les textes OHADA. Tout litige
          sera soumis aux juridictions compétentes de Ouagadougou, Burkina Faso.
          Contact : <strong>{EMAIL}</strong>
        </P>
      </Section>
    </Box>
  );
}

// ─────────────────────────────────────────────
// CONFIDENTIALITÉ
// ─────────────────────────────────────────────
function Confidentialite() {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        Version 1.0 — {DATE} — Conforme aux principes RGPD et à la réglementation UEMOA/BCEAO
      </Typography>

      <Section title="Article 9 — Responsable du traitement">
        <P>
          Le responsable du traitement est ImmoBF Africa. Contact : <strong>{EMAIL}</strong>
        </P>
      </Section>

      <Section title="Article 10 — Données collectées">
        <ul>
          <Li>Données d'identification : nom, téléphone, e-mail.</Li>
          <Li>Données KYC (Annonceurs professionnels) : copie de pièce d'identité.</Li>
          <Li>Données de transaction : montants, références, logs (conservés 10 ans — obligation BCEAO).</Li>
          <Li>Données de navigation : adresses IP, cookies techniques, logs d'accès.</Li>
          <Li>Contenu publié : annonces, photos, descriptions de biens.</Li>
        </ul>
      </Section>

      <Section title="Article 11 — Finalités du traitement">
        <ul>
          <Li>Fourniture du service de mise en relation immobilière.</Li>
          <Li>Traitement et suivi des transactions financières.</Li>
          <Li>Prévention des fraudes et conformité réglementaire (LCB-FT, BCEAO/UEMOA).</Li>
          <Li>Amélioration de la plateforme et personnalisation de l'expérience.</Li>
          <Li>Communication relative au service (notifications, alertes).</Li>
        </ul>
      </Section>

      <Section title="Article 12 — Durée de conservation">
        <P>
          Données de compte : durée d'utilisation active + 5 ans après la dernière connexion.
          Données de transaction : 10 ans (obligation BCEAO de traçabilité des opérations financières).
        </P>
      </Section>

      <Section title="Article 13 — Vos droits">
        <P>Vous disposez des droits suivants, exerçables à <strong>{EMAIL}</strong> :</P>
        <ul>
          <Li>Droit d'accès à vos données personnelles.</Li>
          <Li>Droit de rectification des données inexactes.</Li>
          <Li>Droit à l'effacement (sous réserve des obligations légales de conservation).</Li>
          <Li>Droit d'opposition au traitement à des fins de prospection.</Li>
          <Li>Droit à la portabilité des données.</Li>
        </ul>
      </Section>

      <Section title="Article 14 — Sécurité">
        <P>
          Nous mettons en œuvre des mesures techniques adaptées : chiffrement des mots de passe (Argon2),
          connexions HTTPS/TLS, jetons d'authentification à durée limitée, journalisation des accès.
          Aucun système n'étant infaillible, nous ne pouvons garantir une sécurité absolue.
        </P>
      </Section>

      <Section title="Article 15 — Cookies">
        <P>
          La plateforme utilise uniquement des cookies techniques strictement nécessaires à son fonctionnement.
          Aucun cookie publicitaire ou de traçage tiers n'est déposé sans votre consentement préalable.
        </P>
      </Section>
    </Box>
  );
}

// ─────────────────────────────────────────────
// NON-RESPONSABILITÉ
// ─────────────────────────────────────────────
function NonResponsabilite() {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 3, color: "#888", fontStyle: "italic" }}>
        Version 1.0 — {DATE}
      </Typography>

      <Section title="Article 16 — Nature de la plateforme">
        <P>
          ImmoBF Africa est une place de marché numérique. L'éditeur ne se porte pas garant de la qualité,
          véracité, légalité ou authenticité des annonces publiées par les Utilisateurs. Il appartient
          à chaque partie d'exercer la diligence appropriée — notamment consulter un notaire ou un
          géomètre — avant tout engagement juridique ou financier.
        </P>
      </Section>

      <Section title="Article 17 — Exclusion pour les annonces">
        <P>L'éditeur décline toute responsabilité pour :</P>
        <ul>
          <Li>Les informations inexactes, trompeuses ou frauduleuses publiées par des Annonceurs.</Li>
          <Li>L'état réel du bien (vices cachés, défauts, occupation illégale, litiges fonciers).</Li>
          <Li>Tout défaut de titre foncier valable ou litige relatif à la propriété du bien.</Li>
          <Li>Toute perte financière subie sans vérifications préalables adéquates.</Li>
        </ul>
      </Section>

      <Section title="Article 18 — Exclusion pour les transactions">
        <P>L'éditeur ne saurait être tenu responsable de :</P>
        <ul>
          <Li>Tout échec ou retard de paiement imputable aux prestataires tiers (FedaPay, Orange Money, Moov, Wave).</Li>
          <Li>Toute perte résultant d'un accès non autorisé au compte par négligence de l'Utilisateur.</Li>
          <Li>Toute divergence entre les montants affichés et les frais prélevés par les opérateurs mobile money.</Li>
          <Li>Toute interruption ou défaillance technique de la plateforme.</Li>
        </ul>
      </Section>

      <Section title="Article 19 — Exclusion pour la conduite des Utilisateurs">
        <P>L'éditeur ne peut être tenu responsable :</P>
        <ul>
          <Li>De tout abus de confiance, escroquerie ou fraude commis par un Annonceur envers un Visiteur.</Li>
          <Li>De tout manquement d'un Visiteur envers un Annonceur.</Li>
          <Li>De tout litige résultant d'un accord conclu directement entre les parties hors plateforme.</Li>
        </ul>
      </Section>

      <Section title="Article 20 — Limitation de responsabilité">
        <P>
          Dans la mesure permise par le droit burkinabé et les textes OHADA, la responsabilité de
          l'éditeur est limitée aux sommes effectivement perçues de l'Utilisateur au cours des
          12 mois précédant le fait générateur du dommage. Cette limitation ne s'applique pas aux
          dommages résultant d'une faute intentionnelle ou d'une fraude de l'éditeur.
        </P>
      </Section>

      <Section title="Article 21 — Force majeure">
        <P>
          L'éditeur est exonéré en cas d'inexécution résultant d'un événement de force majeure :
          catastrophes naturelles, conflits armés, coupures télécommunications, pandémies,
          actes gouvernementaux restrictifs.
        </P>
      </Section>

      <Section title="Article 22 — Signalement">
        <P>
          Tout contenu manifestement illicite peut être signalé à <strong>{EMAIL}</strong>.
          L'éditeur s'engage à traiter les signalements dans un délai raisonnable.
        </P>
      </Section>
    </Box>
  );
}

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────
export default function Legal() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: "CGU", icon: <GavelIcon fontSize="small" /> },
    { label: "Confidentialité", icon: <PrivacyTipIcon fontSize="small" /> },
    { label: "Non-responsabilité", icon: <WarningAmberIcon fontSize="small" /> },
  ];

  return (
    <Layout title="Mentions légales — ImmoBF Africa">
      <Container maxWidth="md">
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: "#1B6B3A" }}>
          Mentions légales
        </Typography>
        <Typography variant="body2" sx={{ color: "#888", mb: 3 }}>
          Documents juridiques d'ImmoBF Africa — Version 1.0 — {DATE}
        </Typography>

        <Paper elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{ borderBottom: "1px solid #eee", backgroundColor: "#f9f9f9" }}
          >
            {tabs.map((t, i) => (
              <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>
          <Box sx={{ p: { xs: 2, md: 4 } }}>
            {tab === 0 && <CGU />}
            {tab === 1 && <Confidentialite />}
            {tab === 2 && <NonResponsabilite />}
          </Box>
        </Paper>
      </Container>
    </Layout>
  );
}
