const pptxgen = require('pptxgenjs');
const fs = require('fs');
const path = require('path');

// Palette : couleurs ImmoBF Africa — Bleu marine + Orange Afrique
const C = {
  navy: '1A3A6B',
  blue: '2B6CB0',
  orange: 'E8780A',
  amber: 'F6AD55',
  white: 'FFFFFF',
  offWhite: 'F7F8FA',
  dark: '1A202C',
  gray: '4A5568',
  lightGray: 'E2E8F0',
  green: '276749',
  teal: '2C7A7B',
};

const FONT = 'Calibri';

function newPres() {
  const p = new pptxgen();
  p.layout = 'LAYOUT_WIDE'; // 13.3" x 7.5"
  p.author = 'Africa DEV YAZID CONSULTING';
  p.company = 'ImmoBF Africa';
  p.title = 'ImmoBF Africa — Présentation';
  return p;
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function darkSlide(pres, bgColor = C.navy) {
  const slide = pres.addSlide();
  slide.background = { fill: bgColor };
  return slide;
}

function lightSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { fill: C.offWhite };
  return slide;
}

function whiteSlide(pres) {
  const slide = pres.addSlide();
  slide.background = { fill: C.white };
  return slide;
}

function addTitle(slide, text, x, y, w, h, color = C.white, size = 36, bold = true) {
  slide.addText(text, {
    x, y, w, h,
    fontSize: size,
    bold,
    color,
    fontFace: FONT,
    isTextBox: true,
    margin: 0,
  });
}

function addBody(slide, text, x, y, w, h, color = C.dark, size = 16, align = 'left') {
  slide.addText(text, {
    x, y, w, h,
    fontSize: size,
    color,
    fontFace: FONT,
    isTextBox: true,
    margin: 0,
    align,
  });
}

function addAccentBar(slide, x, y, w = 0.6, h = 0.07) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: C.orange },
    line: { type: 'none' },
  });
}

function addCard(slide, x, y, w, h, fillColor = C.white) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fillColor },
    line: { color: C.lightGray, width: 0.5 },
    shadow: { type: 'outer', blur: 8, offset: 4, angle: 45, color: '000000', opacity: 0.12 },
  });
}

function addStatCard(slide, x, y, w, h, number, label, fillColor = C.navy) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: fillColor },
    line: { type: 'none' },
    rectRadius: 0.1,
  });
  slide.addText(number, {
    x, y: y + 0.15, w, h: h * 0.55,
    fontSize: 44,
    bold: true,
    color: C.orange,
    fontFace: FONT,
    isTextBox: true,
    align: 'center',
    margin: 0,
  });
  slide.addText(label, {
    x, y: y + h * 0.6, w, h: h * 0.35,
    fontSize: 13,
    color: C.white,
    fontFace: FONT,
    isTextBox: true,
    align: 'center',
    margin: 0,
  });
}

// ─── SLIDE 1 : COUVERTURE ─────────────────────────────────────────────────────
function slide1(pres) {
  const s = darkSlide(pres, C.navy);

  // Orange accent left strip
  s.addShape('rect', { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.orange }, line: { type: 'none' } });

  // Title
  s.addText('ImmoBF Africa', {
    x: 0.6, y: 1.5, w: 8, h: 1.4,
    fontSize: 56, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });

  // Subtitle
  s.addText("La plateforme immobilière de l'Afrique de l'Ouest", {
    x: 0.6, y: 2.9, w: 8.5, h: 0.7,
    fontSize: 22, color: C.amber, fontFace: FONT,
    isTextBox: true, margin: 0, italics: true,
  });

  // Divider line
  s.addShape('rect', { x: 0.6, y: 3.75, w: 7, h: 0.04, fill: { color: C.orange }, line: { type: 'none' } });

  // Tags
  s.addText('iOS  •  Android  •  Web  •  Mobile Money  •  UEMOA', {
    x: 0.6, y: 3.95, w: 9, h: 0.5,
    fontSize: 16, color: C.lightGray, fontFace: FONT,
    isTextBox: true, margin: 0,
  });

  // Company
  s.addText('Africa DEV YAZID CONSULTING (SARL) — Ouagadougou, Burkina Faso', {
    x: 0.6, y: 6.3, w: 10, h: 0.45,
    fontSize: 13, color: C.gray, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  s.addText('www.immoafrica.online  |  Septembre 2026', {
    x: 0.6, y: 6.75, w: 10, h: 0.4,
    fontSize: 12, color: C.gray, fontFace: FONT,
    isTextBox: true, margin: 0,
  });

  s.addNotes('Slide de couverture — ImmoBF Africa — Septembre 2026');
}

// ─── SLIDE 2 : PROBLÈME ───────────────────────────────────────────────────────
function slide2(pres) {
  const s = darkSlide(pres, '0D1B2A');

  s.addText('Le Problème', {
    x: 0.6, y: 0.4, w: 12, h: 0.7,
    fontSize: 38, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.6, 1.15, 1.2);

  const problems = [
    { icon: '📋', title: 'Marché fragmenté', desc: "Des milliers d'annonces éparpillées sur les réseaux sociaux, sans garantie ni structure." },
    { icon: '💳', title: 'Paiements inadaptés', desc: "Les plateformes étrangères ignorent le mobile money (Orange Money, Wave, Moov) utilisé par 80% des Africains." },
    { icon: '🌍', title: 'Barrière linguistique', desc: "Aucune plateforme locale ne propose les langues nationales (Mooré, Dioula) pour les populations rurales." },
    { icon: '📵', title: 'Pas d\'app dédiée', desc: "Pas de solution mobile professionnelle adaptée aux contraintes de connectivité ouest-africaines." },
  ];

  problems.forEach((p, i) => {
    const x = i < 2 ? 0.5 : 0.5;
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 0.5 + col * 6.4;
    const cy = 1.5 + row * 2.5;

    addCard(s, cx, cy, 5.9, 2.1, '16213E');
    s.addText(p.icon + '  ' + p.title, {
      x: cx + 0.2, y: cy + 0.15, w: 5.5, h: 0.55,
      fontSize: 18, bold: true, color: C.orange, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(p.desc, {
      x: cx + 0.2, y: cy + 0.75, w: 5.5, h: 1.2,
      fontSize: 14, color: C.lightGray, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
  });

  s.addNotes('Le problème : marché immobilier africain fragmenté, paiements mobiles non intégrés, barrière linguistique.');
}

// ─── SLIDE 3 : SOLUTION ───────────────────────────────────────────────────────
function slide3(pres) {
  const s = lightSlide(pres);

  s.addText('La Solution ImmoBF Africa', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.navy, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.5);

  s.addText("Une plateforme immobilière complète, conçue pour l'Afrique de l'Ouest :", {
    x: 0.5, y: 1.3, w: 12, h: 0.5,
    fontSize: 16, color: C.gray, fontFace: FONT, italics: true,
    isTextBox: true, margin: 0,
  });

  const features = [
    { num: '01', title: 'Application Mobile', desc: 'iOS & Android native\n(React Native / Expo)' },
    { num: '02', title: 'Paiements Mobiles', desc: 'Orange Money, Moov\nWave, FedaPay' },
    { num: '03', title: 'Multilingue', desc: 'Français, English\nMooré, Dioula' },
    { num: '04', title: 'Géolocalisation', desc: 'Carte interactive\nbiens géolocalisés' },
    { num: '05', title: 'Commissions', desc: 'Système agents\nconfigurable' },
    { num: '06', title: 'UEMOA Ready', desc: '12+ pays couverts\nexpansion progressive' },
  ];

  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 0.5 + col * 4.25;
    const cy = 2.0 + row * 2.5;

    addCard(s, cx, cy, 3.9, 2.1, C.white);
    s.addText(f.num, {
      x: cx + 0.2, y: cy + 0.15, w: 0.8, h: 0.55,
      fontSize: 22, bold: true, color: C.orange, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(f.title, {
      x: cx + 0.2, y: cy + 0.65, w: 3.5, h: 0.5,
      fontSize: 16, bold: true, color: C.navy, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(f.desc, {
      x: cx + 0.2, y: cy + 1.15, w: 3.5, h: 0.8,
      fontSize: 13, color: C.gray, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
  });

  s.addNotes('La solution : app mobile iOS/Android, paiements mobiles africains, multilingue, géoloc, commissions, 12+ pays.');
}

// ─── SLIDE 4 : CHIFFRES CLÉS ─────────────────────────────────────────────────
function slide4(pres) {
  const s = darkSlide(pres, C.navy);

  s.addText('Chiffres Clés & Statut Déploiement', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.5);

  const stats = [
    { n: '175', l: 'Pays accessibles\n(App Store iOS)' },
    { n: '12+', l: 'Pays UEMOA\nciblés' },
    { n: '4', l: 'Langues\nsupportées' },
    { n: '3', l: 'Opérateurs\nmobile money' },
  ];

  stats.forEach((st, i) => {
    addStatCard(s, 0.5 + i * 3.1, 1.6, 2.8, 2.0, st.n, st.l, '16213E');
  });

  // Status boxes
  const statuses = [
    { title: 'iOS — App Store', detail: 'v1.6.7 (build 7)\nWaiting for Review', color: 'E8780A' },
    { title: 'Android — Google Play', detail: 'v1.6.7 (versionCode 16)\nAlpha publique', color: '276749' },
    { title: 'Backend API', detail: 'Railway — Node.js\nProduction live', color: '2B6CB0' },
    { title: 'Frontend Web', detail: 'Vercel — Next.js\nwww.immoafrica.online', color: '2C7A7B' },
  ];

  statuses.forEach((st, i) => {
    const cx = 0.5 + i * 3.1;
    const cy = 4.0;
    s.addShape('rect', { x: cx, y: cy, w: 2.8, h: 2.8, fill: { color: '16213E' }, line: { color: st.color, width: 2 } });
    s.addShape('rect', { x: cx, y: cy, w: 2.8, h: 0.18, fill: { color: st.color }, line: { type: 'none' } });
    s.addText(st.title, {
      x: cx + 0.1, y: cy + 0.25, w: 2.6, h: 0.55,
      fontSize: 13, bold: true, color: C.white, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(st.detail, {
      x: cx + 0.1, y: cy + 0.9, w: 2.6, h: 1.7,
      fontSize: 12, color: C.lightGray, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
  });

  s.addNotes('Chiffres clés : 175 pays App Store, 12+ pays UEMOA, 4 langues, 3 opérateurs mobile money. Status : iOS en attente, Android Alpha, backend live.');
}

// ─── SLIDE 5 : MARCHÉS ───────────────────────────────────────────────────────
function slide5(pres) {
  const s = whiteSlide(pres);

  s.addText('Marchés Cibles — Zone UEMOA', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.navy, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.5);

  // Left: market priority table
  const rows = [
    { flag: '🇧🇫', country: 'Burkina Faso', priority: '★ Marché principal', color: C.orange },
    { flag: '🇨🇮', country: "Côte d'Ivoire", priority: 'Priorité 1', color: C.blue },
    { flag: '🇸🇳', country: 'Sénégal', priority: 'Priorité 1', color: C.blue },
    { flag: '🇲🇱', country: 'Mali', priority: 'Priorité 2', color: C.teal },
    { flag: '🇹🇬', country: 'Togo', priority: 'Priorité 2', color: C.teal },
    { flag: '🇧🇯', country: 'Bénin', priority: 'Priorité 2', color: C.teal },
    { flag: '🇳🇪', country: 'Niger', priority: 'Priorité 3', color: C.gray },
    { flag: '🇬🇳', country: 'Guinée', priority: 'Priorité 3', color: C.gray },
    { flag: '🇬🇭', country: 'Ghana', priority: 'Priorité 3', color: C.gray },
    { flag: '🇳🇬', country: 'Nigeria', priority: 'Priorité 3', color: C.gray },
    { flag: '🇨🇲', country: 'Cameroun', priority: 'Priorité 4', color: 'A0AEC0' },
    { flag: '🇨🇩', country: 'Congo RDC', priority: 'Priorité 4', color: 'A0AEC0' },
  ];

  rows.forEach((r, i) => {
    const cx = i < 6 ? 0.5 : 6.8;
    const cy = 1.5 + (i % 6) * 0.9;
    s.addText(`${r.flag}  ${r.country}`, {
      x: cx, y: cy, w: 3.0, h: 0.6,
      fontSize: 14, color: C.dark, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(r.priority, {
      x: cx + 3.1, y: cy + 0.05, w: 2.5, h: 0.5,
      fontSize: 13, color: r.color, fontFace: FONT, bold: true,
      isTextBox: true, margin: 0,
    });
  });

  // Right panel: key figures
  s.addShape('rect', { x: 9.5, y: 1.4, w: 3.3, h: 5.6, fill: { color: C.navy }, line: { type: 'none' } });
  s.addText('Marché Immobilier\nAfricain', {
    x: 9.6, y: 1.5, w: 3.1, h: 0.9,
    fontSize: 16, bold: true, color: C.orange, fontFace: FONT,
    isTextBox: true, align: 'center', margin: 0,
  });
  [
    { v: '1.4 Md', l: "d'habitants" },
    { v: '60%', l: 'urbanisation\ncroissante' },
    { v: '80%', l: 'paiements\nmobiles' },
    { v: '$50Mds', l: 'marché immo\nUEMOA (estim.)' },
  ].forEach((item, i) => {
    s.addText(item.v, {
      x: 9.6, y: 2.6 + i * 1.1, w: 3.1, h: 0.5,
      fontSize: 26, bold: true, color: C.amber, fontFace: FONT,
      isTextBox: true, align: 'center', margin: 0,
    });
    s.addText(item.l, {
      x: 9.6, y: 3.1 + i * 1.1, w: 3.1, h: 0.4,
      fontSize: 12, color: C.lightGray, fontFace: FONT,
      isTextBox: true, align: 'center', margin: 0,
    });
  });

  s.addNotes('12 pays ciblés dans la zone UEMOA. Burkina Faso = marché principal. Marché immobilier africain estimé à 50 milliards USD.');
}

// ─── SLIDE 6 : STACK TECHNIQUE ───────────────────────────────────────────────
function slide6(pres) {
  const s = lightSlide(pres);

  s.addText('Architecture Technique', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.navy, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.5);

  const layers = [
    {
      title: '📱 Application Mobile',
      color: C.navy,
      items: ['React Native + Expo SDK', 'EAS Build & Submit', 'iOS (App Store) + Android (Play)', 'Notifications push (APNs/FCM)', 'Bundle ID: africa.immobf.app'],
    },
    {
      title: '🌐 Frontend Web',
      color: C.blue,
      items: ['Next.js (React)', 'Déploiement Vercel', 'SSR + SEO optimisé', 'next-i18next (fr/en/mos/dyu)', 'www.immoafrica.online'],
    },
    {
      title: '⚙️ Backend API',
      color: C.teal,
      items: ['Node.js + Express.js', 'PostgreSQL (Railway)', 'JWT Authentication', 'REST API JSON', 'CI/CD Railway auto'],
    },
    {
      title: '💳 Paiements',
      color: C.green,
      items: ['FedaPay (agrégateur)', 'Orange Money', 'Moov Money', 'Wave Mobile Money', 'Webhooks HMAC sécurisés'],
    },
  ];

  layers.forEach((l, i) => {
    const cx = 0.5 + i * 3.1;
    addCard(s, cx, 1.5, 2.9, 5.5, C.white);
    s.addShape('rect', { x: cx, y: 1.5, w: 2.9, h: 0.55, fill: { color: l.color }, line: { type: 'none' } });
    s.addText(l.title, {
      x: cx + 0.1, y: 1.55, w: 2.7, h: 0.45,
      fontSize: 13, bold: true, color: C.white, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    l.items.forEach((item, j) => {
      s.addText('• ' + item, {
        x: cx + 0.15, y: 2.2 + j * 0.8, w: 2.6, h: 0.6,
        fontSize: 12, color: C.dark, fontFace: FONT,
        isTextBox: true, margin: 0,
      });
    });
  });

  s.addNotes('Stack : React Native (Expo), Next.js (Vercel), Node.js/Express (Railway), PostgreSQL, FedaPay + Orange/Moov/Wave.');
}

// ─── SLIDE 7 : PAIEMENTS ─────────────────────────────────────────────────────
function slide7(pres) {
  const s = darkSlide(pres, '0D1B2A');

  s.addText('Paiements Mobiles — Avantage Concurrentiel', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 34, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.5);

  s.addText("En Afrique de l'Ouest, 80% des transactions passent par le mobile money.\nImmoBF Africa est la seule plateforme immobilière à intégrer nativement ces paiements.", {
    x: 0.5, y: 1.3, w: 12.3, h: 0.8,
    fontSize: 15, color: C.lightGray, fontFace: FONT, italics: true,
    isTextBox: true, margin: 0,
  });

  const operators = [
    { name: 'Orange Money', countries: 'BF, CI, SN, ML, GN, CM...', coverage: '17 pays Afrique', color: 'F97316' },
    { name: 'Moov Money', countries: 'BF, CI, TG, BJ, ML...', coverage: '6 pays UEMOA', color: '3B82F6' },
    { name: 'Wave', countries: 'SN, CI, BF, ML...', coverage: 'UEMOA francophone', color: '06B6D4' },
    { name: 'FedaPay', countries: 'Carte Visa/MC + agrégation', coverage: 'International', color: C.orange },
  ];

  operators.forEach((op, i) => {
    const cx = 0.5 + i * 3.1;
    s.addShape('rect', { x: cx, y: 2.4, w: 2.8, h: 3.8, fill: { color: '16213E' }, line: { color: op.color, width: 1.5 } });
    s.addShape('rect', { x: cx, y: 2.4, w: 2.8, h: 0.18, fill: { color: op.color }, line: { type: 'none' } });
    s.addText(op.name, {
      x: cx + 0.1, y: 2.65, w: 2.6, h: 0.6,
      fontSize: 16, bold: true, color: C.white, fontFace: FONT,
      isTextBox: true, margin: 0, align: 'center',
    });
    s.addText('Pays couverts :', {
      x: cx + 0.1, y: 3.4, w: 2.6, h: 0.35,
      fontSize: 11, color: op.color, fontFace: FONT, bold: true,
      isTextBox: true, margin: 0,
    });
    s.addText(op.countries, {
      x: cx + 0.1, y: 3.75, w: 2.6, h: 0.55,
      fontSize: 12, color: C.lightGray, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(op.coverage, {
      x: cx + 0.1, y: 4.7, w: 2.6, h: 0.5,
      fontSize: 13, color: C.amber, fontFace: FONT, bold: true,
      isTextBox: true, margin: 0, align: 'center',
    });
  });

  s.addText('Aucune carte bancaire requise — 100% mobile money', {
    x: 0.5, y: 6.6, w: 12.3, h: 0.55,
    fontSize: 16, bold: true, color: C.orange, fontFace: FONT,
    isTextBox: true, align: 'center', margin: 0,
  });

  s.addNotes('Avantage concurrentiel : 4 opérateurs mobiles intégrés via FedaPay. 100% mobile money, aucune carte bancaire requise.');
}

// ─── SLIDE 8 : MODÈLE ÉCONOMIQUE ─────────────────────────────────────────────
function slide8(pres) {
  const s = lightSlide(pres);

  s.addText('Modèle Économique', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.navy, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.2);

  const streams = [
    { icon: '⭐', title: 'Annonces Premium', desc: "Publications mises en avant pour les propriétaires et agents.", status: 'En déploiement', statusColor: C.orange },
    { icon: '🤝', title: 'Commissions Agents', desc: "Pourcentage sur transactions immobilières facilitées via la plateforme.", status: 'En déploiement', statusColor: C.orange },
    { icon: '🏢', title: 'Abonnements Pro', desc: "Accès illimité pour agences immobilières avec outils avancés.", status: 'Roadmap Q1 2027', statusColor: C.blue },
    { icon: '📣', title: 'Publicité ciblée', desc: "Espaces publicitaires géolocalisés pour professionnels de l'immo.", status: 'Roadmap Q2 2027', statusColor: C.teal },
    { icon: '🔌', title: 'API Partenaires', desc: "Accès API pour portails immobiliers tiers et intégrations B2B.", status: 'Roadmap 2027', statusColor: C.gray },
    { icon: '📊', title: 'Data & Analytics', desc: "Rapports marché pour investisseurs et promoteurs immobiliers.", status: 'Vision 2028', statusColor: 'A0AEC0' },
  ];

  streams.forEach((st, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = 0.5 + col * 4.25;
    const cy = 1.5 + row * 2.7;
    addCard(s, cx, cy, 3.9, 2.4, C.white);
    s.addText(st.icon + '  ' + st.title, {
      x: cx + 0.2, y: cy + 0.15, w: 3.5, h: 0.55,
      fontSize: 16, bold: true, color: C.navy, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(st.desc, {
      x: cx + 0.2, y: cy + 0.75, w: 3.5, h: 0.8,
      fontSize: 13, color: C.gray, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(st.status, {
      x: cx + 0.2, y: cy + 1.75, w: 3.5, h: 0.45,
      fontSize: 12, bold: true, color: st.statusColor, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
  });

  s.addNotes('6 sources de revenus : annonces premium, commissions agents, abonnements pro, publicité géolocalisée, API partenaires, data/analytics.');
}

// ─── SLIDE 9 : ROADMAP ───────────────────────────────────────────────────────
function slide9(pres) {
  const s = darkSlide(pres, C.navy);

  s.addText('Roadmap 2026 — 2027', {
    x: 0.5, y: 0.35, w: 12, h: 0.7,
    fontSize: 36, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.5, 1.1, 1.2);

  const milestones = [
    { period: 'Q3 2026', items: ['Mise en ligne App Store iOS', 'App Android Beta'], color: C.orange },
    { period: 'Q4 2026', items: ['Commissions opérationnelles', "Expansion CI & SN"], color: C.amber },
    { period: 'Q1 2027', items: ['Abonnements agences', 'Notifications SMS'], color: C.blue },
    { period: 'Q2 2027', items: ['API ouverte partenaires', 'Analytics dashboard'], color: C.teal },
  ];

  milestones.forEach((m, i) => {
    const cx = 0.5 + i * 3.1;

    // Vertical line
    s.addShape('rect', { x: cx + 1.35, y: 1.7, w: 0.06, h: 5.2, fill: { color: m.color }, line: { type: 'none' } });
    // Dot
    s.addShape('ellipse', { x: cx + 1.17, y: 1.62, w: 0.44, h: 0.44, fill: { color: m.color }, line: { type: 'none' } });

    s.addText(m.period, {
      x: cx, y: 1.6, w: 2.7, h: 0.45,
      fontSize: 15, bold: true, color: m.color, fontFace: FONT,
      isTextBox: true, margin: 0,
    });

    m.items.forEach((item, j) => {
      s.addShape('rect', { x: cx + 0.1, y: 2.4 + j * 1.1, w: 2.7, h: 0.85, fill: { color: '16213E' }, line: { color: m.color, width: 0.5 } });
      s.addText('• ' + item, {
        x: cx + 0.2, y: 2.5 + j * 1.1, w: 2.5, h: 0.65,
        fontSize: 13, color: C.white, fontFace: FONT,
        isTextBox: true, margin: 0,
      });
    });
  });

  // Vision 2028
  s.addShape('rect', { x: 0.5, y: 6.2, w: 12.3, h: 0.85, fill: { color: C.orange }, line: { type: 'none' } });
  s.addText('🎯  Vision 2028 : 15 pays  •  500 000 utilisateurs actifs  •  50 000 annonces/mois', {
    x: 0.6, y: 6.3, w: 12.1, h: 0.6,
    fontSize: 15, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, align: 'center', margin: 0,
  });

  s.addNotes('Roadmap Q3 2026 à Q2 2027, vision 2028 : 15 pays, 500k utilisateurs, 50k annonces/mois.');
}

// ─── SLIDE 10 : ÉQUIPE & CONTACT ─────────────────────────────────────────────
function slide10(pres) {
  const s = darkSlide(pres, C.navy);

  // Orange strip left
  s.addShape('rect', { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: C.orange }, line: { type: 'none' } });

  s.addText('Contactez-nous', {
    x: 0.6, y: 0.5, w: 12, h: 0.7,
    fontSize: 38, bold: true, color: C.white, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  addAccentBar(s, 0.6, 1.25, 1.2);

  // Company
  s.addText('Africa DEV YAZID CONSULTING (SARL)', {
    x: 0.6, y: 1.6, w: 8, h: 0.6,
    fontSize: 20, bold: true, color: C.orange, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  s.addText('RCCM : BF-OUA-01-2025-B12-13511   |   IFU : 00282172N', {
    x: 0.6, y: 2.2, w: 8, h: 0.45,
    fontSize: 13, color: C.gray, fontFace: FONT,
    isTextBox: true, margin: 0,
  });
  s.addText('Ouagadougou, Burkina Faso', {
    x: 0.6, y: 2.65, w: 8, h: 0.45,
    fontSize: 13, color: C.gray, fontFace: FONT,
    isTextBox: true, margin: 0,
  });

  const contacts = [
    { label: '🌐 Site web', value: 'www.immoafrica.online' },
    { label: '📧 Contact', value: 'contact@immoafrica.online' },
    { label: '📧 Admin', value: 'admin@immoafrica.online' },
    { label: '📱 iOS', value: 'apps.apple.com/app/id6809453557' },
    { label: '🤖 Android', value: 'play.google.com/store/apps/details?id=africa.immobf.app' },
    { label: '🔒 Confidentialité', value: 'www.immoafrica.online/fr/legal/privacy' },
  ];

  contacts.forEach((c, i) => {
    const col = i < 3 ? 0 : 1;
    const row = i % 3;
    const cx = 0.6 + col * 6.2;
    const cy = 3.5 + row * 0.9;
    s.addText(c.label, {
      x: cx, y: cy, w: 2.2, h: 0.55,
      fontSize: 13, bold: true, color: C.amber, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
    s.addText(c.value, {
      x: cx + 2.3, y: cy, w: 3.5, h: 0.55,
      fontSize: 13, color: C.white, fontFace: FONT,
      isTextBox: true, margin: 0,
    });
  });

  s.addText('ImmoBF Africa — Bâtir l\'avenir de l\'immobilier africain 🌍', {
    x: 0.6, y: 6.6, w: 12, h: 0.5,
    fontSize: 15, bold: true, color: C.orange, fontFace: FONT,
    isTextBox: true, align: 'center', margin: 0,
    italics: true,
  });

  s.addNotes('Contacts : contact@immoafrica.online / admin@immoafrica.online — www.immoafrica.online');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const pres = newPres();
  slide1(pres);
  slide2(pres);
  slide3(pres);
  slide4(pres);
  slide5(pres);
  slide6(pres);
  slide7(pres);
  slide8(pres);
  slide9(pres);
  slide10(pres);

  const outPath = path.join(__dirname, 'ImmoBF_Africa_Presentation.pptx');
  await pres.writeFile({ fileName: outPath });
  console.log('OK Fichier cree :', outPath);
}

main().catch(err => { console.error('Erreur :', err); process.exit(1); });
