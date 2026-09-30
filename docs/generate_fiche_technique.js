const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak,
} = require('docx');
const fs = require('fs');
const path = require('path');

// Colors
const BLUE_DARK = '1A3A6B';
const BLUE_MID = '2B6CB0';
const ORANGE = 'E8780A';
const GRAY_LIGHT = 'F2F4F7';
const GRAY_TEXT = '4A5568';
const WHITE = 'FFFFFF';

function heading1(text) {
  return new Paragraph({
    children: [
      new TextRun({ text, bold: true, size: 28, color: BLUE_DARK, font: 'Calibri' }),
    ],
    spacing: { before: 400, after: 160 },
    border: { bottom: { color: ORANGE, space: 1, value: BorderStyle.SINGLE, size: 12 } },
  });
}

function heading2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: BLUE_MID, font: 'Calibri' })],
    spacing: { before: 320, after: 120 },
  });
}

function heading3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: GRAY_TEXT, font: 'Calibri' })],
    spacing: { before: 240, after: 80 },
  });
}

function bodyText(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: '2D3748', font: 'Calibri' })],
    spacing: { before: 80, after: 80 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function bulletItem(text) {
  return new Paragraph({
    children: [new TextRun({ text: `• ${text}`, size: 20, color: '2D3748', font: 'Calibri' })],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
  });
}

function spacer(size = 120) {
  return new Paragraph({ children: [], spacing: { before: size, after: 0 } });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function makeTable(rows, colWidths, headerRow = true) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: rows.map((row, ri) => new TableRow({
      tableHeader: ri === 0 && headerRow,
      children: row.map((cell, ci) => {
        const isHeader = ri === 0 && headerRow;
        return new TableCell({
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: isHeader
            ? { type: ShadingType.CLEAR, fill: BLUE_DARK }
            : ri % 2 === 0
            ? { type: ShadingType.CLEAR, fill: 'FFFFFF' }
            : { type: ShadingType.CLEAR, fill: GRAY_LIGHT },
          children: [new Paragraph({
            children: [new TextRun({
              text: cell,
              bold: isHeader,
              size: 18,
              color: isHeader ? WHITE : '2D3748',
              font: 'Calibri',
            })],
            spacing: { before: 60, after: 60 },
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          })],
        });
      }),
    })),
  });
}

async function main() {
  const allChildren = [];

  // PAGE DE COUVERTURE
  allChildren.push(
    spacer(800),
    new Paragraph({
      children: [new TextRun({ text: 'ImmoBF Africa', bold: true, size: 64, color: BLUE_DARK, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Fiche Technique Exhaustive', bold: true, size: 40, color: ORANGE, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Plateforme immobilière numérique — Burkina Faso & Afrique de l'Ouest", size: 24, color: GRAY_TEXT, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
    }),
    spacer(400),
    new Paragraph({
      children: [new TextRun({ text: 'Africa DEV YAZID CONSULTING (SARL)', bold: true, size: 22, color: BLUE_MID, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'RCCM : BF-OUA-01-2025-B12-13511  |  IFU : 00282172N', size: 18, color: GRAY_TEXT, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Ouagadougou, Burkina Faso  |  www.immoafrica.online', size: 18, color: GRAY_TEXT, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Septembre 2026', size: 18, color: GRAY_TEXT, font: 'Calibri' })],
      alignment: AlignmentType.CENTER,
    }),
  );

  // SECTION 1
  allChildren.push(
    pageBreak(),
    heading1('1. Présentation Générale du Projet'),
    heading2('1.1 Identité du projet'),
    makeTable([
      ['Champ', 'Valeur'],
      ['Nom du projet', 'ImmoBF Africa'],
      ['Nom commercial', 'ImmoBF / ImmoAfrica'],
      ['Site web', 'https://www.immoafrica.online'],
      ['Secteur', 'Immobilier numérique — PropTech'],
      ['Stade actuel', 'Produit en production (Alpha/Bêta)'],
      ['Date de lancement', 'Janvier 2025'],
      ['Version courante', 'v1.6.7'],
      ['App Store iOS', 'En attente de révision (v1.0, App ID : 6809453557)'],
      ['Google Play Android', 'Alpha publique (versionCode 16)'],
      ['Bundle Identifier', 'africa.immobf.app'],
    ], [3500, 6000]),
    spacer(),
    heading2('1.2 Entité juridique'),
    makeTable([
      ['Champ', 'Valeur'],
      ['Raison sociale', 'Africa DEV YAZID CONSULTING'],
      ['Forme juridique', 'SARL (Société à Responsabilité Limitée)'],
      ['RCCM', 'BF-OUA-01-2025-B12-13511'],
      ['IFU', '00282172N'],
      ['Siège social', 'Ouagadougou, Burkina Faso'],
      ['Email de contact', 'contact@immoafrica.online'],
      ['Email administrateur', 'admin@immoafrica.online'],
    ], [3500, 6000]),
    spacer(),
    heading2('1.3 Vision et mission'),
    bodyText("ImmoBF Africa ambitionne de devenir la référence numérique de l'immobilier en Afrique de l'Ouest francophone. La plateforme connecte propriétaires, locataires, acheteurs et agents immobiliers au travers d'une expérience digitale inclusive, multilingue et adaptée aux réalités du marché africain."),
    bodyText("La mission est de démocratiser l'accès au logement et à l'investissement immobilier en Afrique subsaharienne, en proposant des outils simples, fiables et accessibles depuis un smartphone, avec des modes de paiement locaux intégrés."),
  );

  // SECTION 2
  allChildren.push(
    pageBreak(),
    heading1('2. Marchés Cibles et Expansion Géographique'),
    heading2('2.1 Marché primaire'),
    bodyText("Le marché primaire est le Burkina Faso, avec Ouagadougou comme épicentre de la dynamique immobilière urbaine. La plateforme a été conçue en priorité pour répondre aux besoins locaux : multilinguisme (Français, Mooré, Dioula), paiements mobiles (Orange Money, Moov Money, Wave) et ergonomie adaptée aux connexions limitées."),
    heading2('2.2 Zone d\'expansion UEMOA'),
    makeTable([
      ['Pays', 'Code', 'Statut'],
      ["Côte d'Ivoire", 'CI', 'Priorité 1'],
      ['Sénégal', 'SN', 'Priorité 1'],
      ['Mali', 'ML', 'Priorité 2'],
      ['Togo', 'TG', 'Priorité 2'],
      ['Bénin', 'BJ', 'Priorité 2'],
      ['Niger', 'NE', 'Priorité 3'],
      ['Guinée', 'GN', 'Priorité 3'],
      ['Ghana', 'GH', 'Priorité 3'],
      ['Nigeria', 'NG', 'Priorité 3'],
      ['Cameroun', 'CM', 'Priorité 4'],
      ['Congo RDC', 'CD', 'Priorité 4'],
      ['Maroc', 'MA', 'Priorité 4'],
    ], [3500, 1500, 4500]),
    spacer(),
    heading2('2.3 Accessibilité internationale'),
    bodyText("L'application iOS est disponible dans 175 pays sur l'App Store. La version Android est en phase Alpha sur Google Play. La plateforme web est accessible mondialement via https://www.immoafrica.online."),
  );

  // SECTION 3
  allChildren.push(
    pageBreak(),
    heading1('3. Fonctionnalités de la Plateforme'),
    heading2('3.1 Fonctionnalités pour les utilisateurs'),
    heading3('Recherche et consultation'),
    bulletItem('Recherche avancée de biens immobiliers avec filtres multiples (pays, ville, type de bien, transaction, superficie, prix, meublé/non meublé)'),
    bulletItem('Fiches détaillées avec galerie photos, description, localisation, prix et contacts'),
    bulletItem('Géolocalisation des biens sur carte interactive'),
    bulletItem('Favoris et historique de recherche'),
    bulletItem("Partage d'annonces par lien direct"),
    heading3("Publication d'annonces"),
    bulletItem("Interface de création d'annonce simplifiée"),
    bulletItem("Upload de photos depuis la galerie ou l'appareil photo"),
    bulletItem("Sélection du type de bien (appartement, villa, terrain, bureau, commerce, entrepôt)"),
    bulletItem("Définition du type de transaction (location, vente, colocation)"),
    bulletItem("Paramétrage du prix et de la devise"),
    heading3('Gestion de compte'),
    bulletItem('Inscription et connexion sécurisées (email + mot de passe)'),
    bulletItem('Profil utilisateur avec photo et informations de contact'),
    bulletItem("Tableau de bord de gestion des annonces publiées"),
    bulletItem('Notifications push (iOS et Android)'),
    spacer(),
    heading2('3.2 Système de commissions'),
    bodyText("ImmoBF Africa intègre un système de commissions configurable permettant aux agents immobiliers de définir leurs taux de rémunération sur les transactions. Ce système est géré directement depuis le backend et est lié au module de paiement mobile."),
    heading2('3.3 Fonctionnalités multilingues'),
    makeTable([
      ['Langue', 'Code', 'Couverture'],
      ['Français', 'fr', 'Complète (langue principale)'],
      ['English', 'en', 'Complète'],
      ['Mooré', 'mos', 'Partielle (interface principale)'],
      ['Dioula', 'dyu', 'Partielle (interface principale)'],
    ], [3500, 1500, 4500]),
  );

  // SECTION 4
  allChildren.push(
    pageBreak(),
    heading1('4. Architecture Technique'),
    heading2("4.1 Vue d'ensemble"),
    bodyText("ImmoBF Africa repose sur une architecture moderne découplée (frontend/backend/mobile), entièrement hébergée sur des infrastructures cloud. La plateforme est organisée en trois couches principales : application mobile native, frontend web, et API backend REST."),
    heading2('4.2 Stack technologique'),
    makeTable([
      ['Composant', 'Technologie', 'Hébergeur / Service'],
      ['Application mobile', 'React Native + Expo (EAS)', 'Apple App Store / Google Play'],
      ['Frontend web', 'Next.js (React)', 'Vercel'],
      ['Backend API', 'Node.js + Express.js', 'Railway'],
      ['Base de données', 'PostgreSQL', 'Railway (managed)'],
      ['Paiements', 'FedaPay (agrégateur)', 'FedaPay API'],
      ['Notifications push', 'Expo Push Notifications', 'Expo / APNs / FCM'],
      ['Stockage médias', 'Cloudinary / Railway volumes', 'Cloud'],
      ['Authentification', 'JWT (JSON Web Tokens)', 'Backend custom'],
    ], [3000, 3000, 3500]),
    spacer(),
    heading2('4.3 Application mobile'),
    makeTable([
      ['Propriété', 'Valeur'],
      ['Framework', 'React Native (Expo SDK)'],
      ['Build system', 'EAS Build (Expo Application Services)'],
      ['Bundle ID (iOS)', 'africa.immobf.app'],
      ['Application ID (Android)', 'africa.immobf.app'],
      ['Version courante', '1.6.7'],
      ['Build iOS (App Store)', '7 (waiting for review)'],
      ['VersionCode Android', '16 (Alpha)'],
      ['App ID Apple', '6809453557'],
      ['Chiffrement', 'ITSAppUsesNonExemptEncryption = false'],
      ['Age rating iOS', '4+'],
    ], [4000, 5500]),
    spacer(),
    heading2('4.4 Backend API'),
    makeTable([
      ['Propriété', 'Valeur'],
      ['URL de production', 'https://immobf-africa-production.up.railway.app'],
      ['Runtime', 'Node.js (LTS)'],
      ['Framework', 'Express.js'],
      ['ORM / Requêtes', 'PostgreSQL natif (pg)'],
      ['Authentification', 'JWT Bearer Tokens'],
      ['Architecture', 'REST API (JSON)'],
      ['Hébergeur', 'Railway (conteneur Docker)'],
      ['Base de données', 'PostgreSQL 15+ (Railway managed)'],
      ['Variables env', 'Railway Environment Variables'],
    ], [4000, 5500]),
    spacer(),
    heading2('4.5 Frontend web'),
    makeTable([
      ['Propriété', 'Valeur'],
      ['URL', 'https://www.immoafrica.online'],
      ['Framework', 'Next.js (React)'],
      ['Déploiement', 'Vercel (CI/CD automatique)'],
      ['Internationalisation', 'next-i18next (fr/en/mos/dyu)'],
      ['SEO', 'Server-Side Rendering (SSR) + Open Graph'],
      ['Responsive', 'Mobile-first design'],
    ], [4000, 5500]),
  );

  // SECTION 5
  allChildren.push(
    pageBreak(),
    heading1('5. Système de Paiement'),
    heading2('5.1 Agrégateur de paiement'),
    bodyText("ImmoBF Africa utilise FedaPay comme agrégateur de paiement central. FedaPay est une fintech ouest-africaine agréée, spécialisée dans l'intégration des paiements mobiles en Afrique subsaharienne. Son API unifie l'accès aux principaux opérateurs de mobile money de la région."),
    heading2('5.2 Méthodes de paiement intégrées'),
    makeTable([
      ['Opérateur', 'Service', 'Pays couverts'],
      ['Orange', 'Orange Money', 'BF, CI, SN, ML, GN, CM...'],
      ['Moov', 'Moov Money', 'BF, CI, TG, BJ, ML...'],
      ['Wave', 'Wave Mobile Money', 'SN, CI, BF, ML...'],
      ['FedaPay', 'Carte bancaire (Visa/MC)', 'International'],
    ], [2500, 2500, 4500]),
    spacer(),
    heading2('5.3 Flux de paiement'),
    bulletItem("L'utilisateur sélectionne sa méthode de paiement dans l'application"),
    bulletItem("FedaPay génère un lien de paiement sécurisé"),
    bulletItem("L'utilisateur complète le paiement via son opérateur mobile"),
    bulletItem("FedaPay envoie une notification webhook au backend ImmoBF"),
    bulletItem("Le backend met à jour le statut de la transaction et active le service"),
    heading2('5.4 Conformité et sécurité'),
    bulletItem("Toutes les transactions transitent par FedaPay (entité réglementée)"),
    bulletItem("Aucune donnée de carte bancaire n'est stockée sur les serveurs ImmoBF"),
    bulletItem("Les webhooks FedaPay sont validés par signature HMAC"),
    bulletItem("Chiffrement HTTPS/TLS sur toutes les communications"),
  );

  // SECTION 6
  allChildren.push(
    pageBreak(),
    heading1('6. Protection des Données et Conformité'),
    heading2('6.1 Politique de confidentialité'),
    bodyText("ImmoBF Africa dispose d'une politique de confidentialité complète, accessible à l'adresse : https://www.immoafrica.online/fr/legal/privacy"),
    heading2('6.2 Données collectées'),
    makeTable([
      ['Type de donnée', 'Finalité', 'Lié à l\'identité', 'Tracking'],
      ['Nom / Prénom', "Fonctionnalité app", 'Oui', 'Non'],
      ['Email', "Fonctionnalité app", 'Oui', 'Non'],
      ['Téléphone', "Fonctionnalité app", 'Oui', 'Non'],
      ['Localisation précise', "Fonctionnalité app", 'Non', 'Non'],
      ['Photos / Vidéos', "Fonctionnalité app", 'Oui', 'Non'],
      ['Identifiant utilisateur', "Fonctionnalité app", 'Oui', 'Non'],
      ["Historique d'achats", "Fonctionnalité app", 'Oui', 'Non'],
    ], [3000, 2500, 2000, 2000]),
    spacer(),
    heading2('6.3 Conformité App Store'),
    bulletItem("Age Rating Apple App Store : 4+ (contenu tous publics)"),
    bulletItem("Digital Services Act (DSA) : déclaration de non-traçage publicitaire"),
    bulletItem("App Privacy Nutrition Label configuré sur App Store Connect"),
    bulletItem("Chiffrement iOS : ITSAppUsesNonExemptEncryption = false (exempt)"),
  );

  // SECTION 7
  allChildren.push(
    pageBreak(),
    heading1('7. Modèle Économique'),
    heading2('7.1 Sources de revenus'),
    makeTable([
      ['Source', 'Description', 'Maturité'],
      ['Annonces premium', "Publication d'annonces en mise en avant payante", 'En cours de déploiement'],
      ['Commissions agents', 'Pourcentage sur transactions facilitées', 'En cours de déploiement'],
      ['Abonnements pros', 'Accès illimité pour agences immobilières', 'Roadmap Q1 2027'],
      ['Publicité ciblée', 'Espaces publicitaires géolocalisés', 'Roadmap Q2 2027'],
      ['API Partenaires', 'Accès API pour portails immobiliers tiers', 'Roadmap 2027'],
    ], [2500, 4000, 3000]),
    spacer(),
    heading2('7.2 Proposition de valeur'),
    bulletItem('Gratuit pour les particuliers : publication et consultation sans frais'),
    bulletItem('Paiements 100% mobiles : aucune carte bancaire nécessaire'),
    bulletItem('Multilingue : barrière linguistique supprimée pour les langues locales'),
    bulletItem('Couverture régionale : un seul compte, toute la zone UEMOA'),
    bulletItem('Disponible sur iOS, Android et site web responsive'),
  );

  // SECTION 8
  allChildren.push(
    pageBreak(),
    heading1('8. Infrastructure et DevOps'),
    heading2('8.1 Déploiement et CI/CD'),
    makeTable([
      ['Composant', 'Stratégie de déploiement'],
      ['Frontend web', 'Push Git → Vercel CI/CD (déploiement automatique)'],
      ['Backend API', 'Push Git → Railway CI/CD (déploiement automatique)'],
      ['App mobile iOS', 'EAS Build → EAS Submit → App Store Connect'],
      ['App mobile Android', 'EAS Build → Google Play Console (manuel)'],
    ], [3000, 6500]),
    spacer(),
    heading2('8.2 Environnements'),
    makeTable([
      ['Environnement', 'URL / Identifiant', 'Usage'],
      ['Production backend', 'https://immobf-africa-production.up.railway.app', 'API live'],
      ['Production frontend', 'https://www.immoafrica.online', 'Site web live'],
      ['App Store iOS', 'App ID 6809453557 — africa.immobf.app', 'Distribution iOS'],
      ['Google Play', 'africa.immobf.app — Alpha track', 'Distribution Android'],
    ], [2500, 4000, 3000]),
    spacer(),
    heading2('8.3 Monitoring et logs'),
    bulletItem('Railway Dashboard : métriques CPU/mémoire/réseau du backend en temps réel'),
    bulletItem('Vercel Analytics : métriques de performance et pages vues du frontend'),
    bulletItem('Expo Dashboard : statistiques des notifications push et des builds'),
    bulletItem('App Store Connect : crashs, performances, avis utilisateurs iOS'),
    bulletItem('Google Play Console : crashs Android, ANRs, avis utilisateurs'),
  );

  // SECTION 9
  allChildren.push(
    pageBreak(),
    heading1('9. Roadmap et Perspectives'),
    heading2('9.1 Roadmap technique 2026-2027'),
    makeTable([
      ['Période', 'Jalon', 'Statut'],
      ['Q3 2026', 'Mise en ligne App Store iOS (v1.0)', 'En attente de révision'],
      ['Q3 2026', 'Passage de Alpha à Beta Google Play', 'Planifié'],
      ['Q4 2026', 'Système de paiement commissions opérationnel', 'En développement'],
      ["Q4 2026", "Expansion CI et SN (Côte d'Ivoire, Sénégal)", 'Planifié'],
      ['Q1 2027', 'Abonnements professionnels agences', 'Roadmap'],
      ['Q1 2027', 'Notifications SMS (africaines)', 'Roadmap'],
      ['Q2 2027', 'API ouverte pour partenaires', 'Roadmap'],
      ['Q2 2027', 'Tableau de bord analytics propriétaires', 'Roadmap'],
      ['H2 2027', 'Extension Cameroun, RDC, Maroc', 'Roadmap'],
    ], [2000, 4500, 3000]),
    spacer(),
    heading2('9.2 Vision 2028'),
    bodyText("À l'horizon 2028, ImmoBF Africa vise à devenir la première plateforme immobilière panafricaine francophone, avec une présence dans 15 pays, 500 000 utilisateurs actifs et 50 000 annonces publiées par mois."),
  );

  // SECTION 10
  allChildren.push(
    pageBreak(),
    heading1('10. Contacts et Ressources'),
    heading2('10.1 Contacts clés'),
    makeTable([
      ['Rôle', 'Email / URL'],
      ['Direction générale', 'admin@immoafrica.online'],
      ['Support utilisateurs', 'contact@immoafrica.online'],
      ['Compte App Review (iOS)', 'review@immoafrica.online'],
      ['Site web', 'https://www.immoafrica.online'],
      ['Politique de confidentialité', 'https://www.immoafrica.online/fr/legal/privacy'],
      ['CGU', 'https://www.immoafrica.online/fr/legal/terms'],
      ['App Store iOS', 'https://apps.apple.com/app/id6809453557'],
      ['Google Play', 'https://play.google.com/store/apps/details?id=africa.immobf.app'],
      ['Testeurs Android (Alpha)', 'https://play.google.com/apps/testing/africa.immobf.app'],
    ], [3500, 6000]),
    spacer(200),
    new Paragraph({
      children: [new TextRun({ text: 'Document préparé par Africa DEV YAZID CONSULTING — Septembre 2026', size: 16, color: GRAY_TEXT, font: 'Calibri', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 0 },
    }),
  );

  const doc = new Document({
    sections: [{ children: allChildren }],
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(__dirname, 'ImmoBF_Africa_Fiche_Technique.docx');
  fs.writeFileSync(outPath, buffer);
  console.log('OK Fichier cree :', outPath);
}

main().catch(err => { console.error('Erreur :', err); process.exit(1); });
