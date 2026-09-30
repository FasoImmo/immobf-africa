"""
Génère ImmoBF_Africa_Fiche_Technique.pdf
Usage : python generate_fiche_technique_pdf.py
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.colors import HexColor
import os

# ── Couleurs ──────────────────────────────────────────────────────────────────
GREEN   = HexColor("#0E7C66")
ORANGE  = HexColor("#E8780A")
NAVY    = HexColor("#1A3A6B")
LIGHT_GREEN = HexColor("#E8F5F1")
LIGHT_ORANGE = HexColor("#FFF3E0")
WHITE   = colors.white
BLACK   = colors.black
GREY    = HexColor("#555555")
LGREY   = HexColor("#F5F5F5")

W, H = A4
OUT = os.path.join(os.path.dirname(__file__), "ImmoBF_Africa_Fiche_Technique.pdf")

# ── En-tête / Pied de page ────────────────────────────────────────────────────
def header_footer(canvas, doc):
    canvas.saveState()
    # Bande verte en-tête
    canvas.setFillColor(GREEN)
    canvas.rect(0, H - 2.2*cm, W, 2.2*cm, fill=1, stroke=0)
    # Logo / Titre en-tête
    canvas.setFont("Helvetica-Bold", 14)
    canvas.setFillColor(WHITE)
    canvas.drawString(1.5*cm, H - 1.4*cm, "ImmoBF Africa")
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(W - 1.5*cm, H - 1.4*cm, "Fiche Technique — Plateforme Immobilière Africaine")
    # Bande orange bas
    canvas.setFillColor(ORANGE)
    canvas.rect(0, 0, W, 0.8*cm, fill=1, stroke=0)
    # Numéro de page
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(WHITE)
    canvas.drawCentredString(W/2, 0.25*cm, f"Page {doc.page}  |  www.immoafrica.online  |  contact@immoafrica.online")
    canvas.restoreState()

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "MainTitle", fontSize=26, fontName="Helvetica-Bold",
    textColor=WHITE, alignment=TA_CENTER, spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "SubTitle", fontSize=13, fontName="Helvetica",
    textColor=HexColor("#F6AD55"), alignment=TA_CENTER, spaceAfter=4,
)
h1_style = ParagraphStyle(
    "H1", fontSize=14, fontName="Helvetica-Bold",
    textColor=WHITE, spaceAfter=4, spaceBefore=14,
    backColor=GREEN, leftIndent=-0.5*cm, rightIndent=-0.5*cm,
    borderPad=6,
)
h2_style = ParagraphStyle(
    "H2", fontSize=11, fontName="Helvetica-Bold",
    textColor=NAVY, spaceAfter=4, spaceBefore=8,
    borderPadding=(0,0,2,0),
)
body_style = ParagraphStyle(
    "Body", fontSize=9.5, fontName="Helvetica",
    textColor=HexColor("#222222"), leading=14,
    spaceAfter=4, alignment=TA_JUSTIFY,
)
bullet_style = ParagraphStyle(
    "Bullet", fontSize=9.5, fontName="Helvetica",
    textColor=HexColor("#222222"), leading=14,
    leftIndent=18, bulletIndent=6, spaceAfter=2,
)
label_style = ParagraphStyle(
    "Label", fontSize=9, fontName="Helvetica-Bold",
    textColor=NAVY,
)
value_style = ParagraphStyle(
    "Value", fontSize=9, fontName="Helvetica",
    textColor=GREY,
)

def section_title(text):
    return [
        Spacer(1, 0.3*cm),
        Table(
            [[Paragraph(f"  {text}", ParagraphStyle("SH", fontSize=12, fontName="Helvetica-Bold",
              textColor=WHITE, leading=16))]],
            colWidths=[W - 3*cm],
            style=TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), GREEN),
                ("TOPPADDING",    (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("ROUNDEDCORNERS", [4]),
            ])
        ),
        Spacer(1, 0.2*cm),
    ]

def sub_title(text):
    return [
        Paragraph(text, ParagraphStyle("ST", fontSize=11, fontName="Helvetica-Bold",
                  textColor=ORANGE, spaceAfter=3, spaceBefore=6)),
        HRFlowable(width="100%", thickness=0.5, color=ORANGE, spaceAfter=4),
    ]

def bullet(text):
    return Paragraph(f"• {text}", bullet_style)

def kv_table(rows, col1=5*cm, col2=None):
    col2 = col2 or (W - 3*cm - col1)
    data = [[Paragraph(k, label_style), Paragraph(v, value_style)] for k, v in rows]
    return Table(data, colWidths=[col1, col2], style=TableStyle([
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [LGREY, WHITE]),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("TOPPADDING",    (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#DDDDDD")),
    ]))

# ── Contenu ───────────────────────────────────────────────────────────────────
story = []

# PAGE DE COUVERTURE
story.append(Spacer(1, 1.5*cm))
cover = Table(
    [[Paragraph("ImmoBF Africa", ParagraphStyle("CT", fontSize=32, fontName="Helvetica-Bold",
       textColor=WHITE, alignment=TA_CENTER))],
     [Paragraph("FICHE TECHNIQUE EXHAUSTIVE", ParagraphStyle("CS", fontSize=16, fontName="Helvetica-Bold",
       textColor=HexColor("#F6AD55"), alignment=TA_CENTER, spaceBefore=8))],
     [Paragraph("Plateforme Immobilière d'Afrique de l'Ouest", ParagraphStyle("CD", fontSize=11,
       fontName="Helvetica", textColor=HexColor("#CCE8E1"), alignment=TA_CENTER, spaceBefore=4))],
    ],
    colWidths=[W - 3*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), GREEN),
        ("TOPPADDING",    (0,0), (-1,-1), 20),
        ("BOTTOMPADDING", (0,0), (-1,-1), 20),
        ("ROUNDEDCORNERS", [8]),
    ])
)
story.append(cover)
story.append(Spacer(1, 0.8*cm))

# Infos rapides
quick = [
    ["Site Web", "www.immoafrica.online"],
    ["Contact", "contact@immoafrica.online"],
    ["Fondée en", "2025 — Ouagadougou, Burkina Faso"],
    ["Marchés", "Burkina Faso · Côte d'Ivoire · Sénégal · Mali · Togo · Bénin"],
    ["Paiements", "Orange Money · Moov Money · Wave · Flutterwave · FedaPay"],
    ["Apps", "iOS (App Store) & Android (Google Play)"],
    ["Version", "2.0 — Septembre 2026"],
]
story.append(kv_table(quick, col1=4.5*cm))
story.append(PageBreak())

# ── SECTION 1 : PRÉSENTATION ──────────────────────────────────────────────────
story += section_title("1. Présentation Générale")
story.append(Paragraph(
    "ImmoBF Africa est une plateforme numérique de référence dédiée à l'immobilier en Afrique de l'Ouest. "
    "Elle connecte acheteurs, locataires, vendeurs et propriétaires dans un écosystème sécurisé, multilingue et "
    "adapté aux réalités locales — notamment en matière de paiement mobile money.",
    body_style))
story.append(Spacer(1, 0.3*cm))

story += sub_title("Proposition de valeur")
for item in [
    "Premier portail immobilier à intégrer nativement Orange Money, Moov Money et Wave",
    "Modération automatique des annonces par IA pour garantir la qualité",
    "Système d'escrow sécurisé pour les transactions immobilières",
    "Application mobile native iOS & Android avec mode hors ligne",
    "Internationalisation complète : français & anglais",
]:
    story.append(bullet(item))

# ── SECTION 2 : MARCHÉS ──────────────────────────────────────────────────────
story += section_title("2. Marchés Cibles")
story += sub_title("Zone géographique de couverture")
marches = [
    ["Burkina Faso 🇧🇫", "Marché principal · Ouagadougou · Bobo-Dioulasso", "XOF"],
    ["Côte d'Ivoire 🇨🇮", "En déploiement · Abidjan · Yamoussoukro", "XOF"],
    ["Sénégal 🇸🇳", "En déploiement · Dakar · Saint-Louis", "XOF"],
    ["Mali 🇲🇱", "Planifié · Bamako", "XOF"],
    ["Togo 🇹🇬", "Planifié · Lomé", "XOF"],
    ["Bénin 🇧🇯", "Planifié · Cotonou", "XOF"],
]
mt = Table(
    [["Pays", "Couverture", "Devise"]] + marches,
    colWidths=[4*cm, 9*cm, 2.5*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [LGREY, WHITE]),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
    ])
)
story.append(mt)

# ── SECTION 3 : FONCTIONNALITÉS ───────────────────────────────────────────────
story += section_title("3. Fonctionnalités Principales")

story += sub_title("3.1 Gestion des annonces")
for f in [
    "Publication d'annonces : vente, location longue durée, location courte durée",
    "Types de biens : appartements, villas, terrains, bureaux, locaux commerciaux",
    "Galerie photos (upload multiple) et vidéos",
    "Géolocalisation sur carte interactive (OpenStreetMap / Leaflet)",
    "Estimation automatique du prix par IA (modèle de valorisation)",
    "Score de qualité de l'annonce avec recommandations",
    "Durée d'expiration configurable avec alertes de renouvellement",
    "Traduction automatique FR ↔ EN des titres et descriptions",
]:
    story.append(bullet(f))

story += sub_title("3.2 Recherche et filtres")
for f in [
    "Recherche full-text multilingue (français & anglais)",
    "Filtres : pays, ville, quartier, type de bien, fourchette de prix, surface, chambres",
    "Tri : plus récent, prix croissant/décroissant, surface",
    "Suggestions personnalisées basées sur l'historique de navigation (IA)",
    "Alertes email pour les nouvelles annonces correspondant aux critères sauvegardés",
    "Carte interactive avec clustering des annonces",
]:
    story.append(bullet(f))

story += sub_title("3.3 Messagerie & Contact")
for f in [
    "Messagerie intégrée acheteur/locataire ↔ vendeur/propriétaire",
    "Notifications temps réel (WebSocket)",
    "Intégration WhatsApp Business pour contact direct",
    "Système d'avis et notations des vendeurs",
]:
    story.append(bullet(f))

# ── SECTION 4 : ARCHITECTURE ──────────────────────────────────────────────────
story.append(PageBreak())
story += section_title("4. Architecture Technique")

story += sub_title("4.1 Stack technologique")
stack = [
    ["Frontend Web", "Next.js 14 · React · Material UI · Leaflet", "TypeScript / JSX"],
    ["Backend API", "Node.js · Express · PostgreSQL · Redis", "JavaScript (ES2022)"],
    ["Application Mobile", "React Native · Expo SDK 51", "TypeScript"],
    ["Base de données", "PostgreSQL (principal) · Redis (cache/sessions)", "SQL"],
    ["Stockage médias", "Cloudflare R2 / AWS S3-compatible", "CDN mondial"],
    ["Monitoring", "Sentry (erreurs) · Vercel Analytics", "APM"],
    ["CI/CD", "GitHub Actions · Vercel (frontend) · Railway (backend)", "Automatisé"],
]
st = Table(
    [["Composant", "Technologies", "Langage/Type"]] + stack,
    colWidths=[4*cm, 8*cm, 3.5*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [LGREY, WHITE]),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ])
)
story.append(st)

story += sub_title("4.2 API REST")
for f in [
    "Architecture RESTful avec versionnement (/api/v1/)",
    "Authentification JWT + refresh tokens sécurisés",
    "Rate limiting par IP et par utilisateur (Redis)",
    "Validation des entrées avec Joi",
    "Documentation OpenAPI / Swagger",
    "Gestion d'erreurs centralisée avec codes HTTP standards",
]:
    story.append(bullet(f))

story += sub_title("4.3 Sécurité")
for f in [
    "HTTPS forcé (HSTS avec preload, max-age=2 ans)",
    "Content Security Policy (CSP) stricte",
    "Protection CSRF, XSS, injection SQL",
    "Chiffrement des données sensibles en base",
    "Audit logs des actions administrateur",
    "Modération automatique des annonces (score de toxicité IA)",
]:
    story.append(bullet(f))

# ── SECTION 5 : PAIEMENTS ────────────────────────────────────────────────────
story += section_title("5. Système de Paiement Mobile Money")

story += sub_title("5.1 Prestataires intégrés")
pay_data = [
    ["Orange Money", "Burkina Faso · Côte d'Ivoire · Mali · Sénégal", "USSD + API"],
    ["Moov Money", "Burkina Faso · Togo · Bénin", "API directe"],
    ["Wave", "Burkina Faso · Sénégal · Côte d'Ivoire", "API + QR Code"],
    ["Flutterwave", "Panafricain (17 pays)", "Carte + Mobile"],
    ["FedaPay", "Bénin · Togo", "API"],
    ["CinetPay", "Côte d'Ivoire + zone CEDEAO", "API"],
    ["PawaPay", "Afrique subsaharienne", "API agrégateur"],
    ["BarkaPay", "Burkina Faso", "API locale"],
    ["PayDunya", "Sénégal · Côte d'Ivoire · Mali", "API"],
]
pt = Table(
    [["Opérateur", "Pays couverts", "Méthode"]] + pay_data,
    colWidths=[4*cm, 9*cm, 2.5*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), ORANGE),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [LIGHT_ORANGE, WHITE]),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
    ])
)
story.append(pt)

story += sub_title("5.2 Flux de paiement")
for f in [
    "Système d'escrow sécurisé : les fonds sont bloqués jusqu'à validation de la transaction",
    "Reçus PDF générés automatiquement et envoyés par email",
    "Réconciliation automatique des paiements (cron job quotidien)",
    "Gestion des remboursements et litiges",
    "Commission ImmoBF Africa : prélevée automatiquement à chaque transaction",
    "Webhooks de confirmation des opérateurs mobiles",
]:
    story.append(bullet(f))

# ── SECTION 6 : CONFORMITÉ ───────────────────────────────────────────────────
story.append(PageBreak())
story += section_title("6. Protection des Données & Conformité")

for f in [
    "Hébergement des données en conformité avec les lois locales (UEMOA)",
    "Politique de confidentialité et CGU disponibles sur le site",
    "Droit à l'oubli : suppression de compte et données sur demande",
    "Chiffrement des mots de passe (bcrypt, factor 12)",
    "OTP (One-Time Password) pour les opérations sensibles",
    "Journalisation des accès et actions administrateur",
    "Aucune revente de données personnelles à des tiers",
]:
    story.append(bullet(f))

# ── SECTION 7 : MODÈLE ÉCONOMIQUE ────────────────────────────────────────────
story += section_title("7. Modèle Économique")

story += sub_title("7.1 Sources de revenus")
rev = [
    ["Commission transactions", "% prélevé sur chaque paiement via la plateforme", "Principal"],
    ["Abonnements premium", "Visibilité accrue pour les agences et promoteurs", "Récurrent"],
    ["Mise en avant d'annonces", "Boost de visibilité pour les particuliers", "À l'acte"],
    ["Services additionnels", "Estimation, visite virtuelle, conseil juridique", "À l'acte"],
    ["API B2B", "Accès à l'API pour agences et développeurs", "Abonnement"],
]
rt = Table(
    [["Source", "Description", "Type"]] + rev,
    colWidths=[4.5*cm, 9*cm, 2*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), NAVY),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 8.5),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [LGREY, WHITE]),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
    ])
)
story.append(rt)

# ── SECTION 8 : INFRASTRUCTURE ───────────────────────────────────────────────
story += section_title("8. Infrastructure & DevOps")

for f in [
    "Frontend : Vercel (CDN mondial, déploiement automatique depuis GitHub)",
    "Backend : Railway (conteneurs Docker, scaling automatique)",
    "Base de données : PostgreSQL managé avec sauvegardes quotidiennes",
    "Cache : Redis Cloud (sessions, rate limiting, suggestions IA)",
    "CDN médias : Cloudflare R2 (photos et vidéos des annonces)",
    "Monitoring : Sentry pour les erreurs frontend et backend",
    "CI/CD : GitHub Actions — tests automatiques à chaque pull request",
    "Uptime cible : 99,9% (SLA Vercel + Railway)",
]:
    story.append(bullet(f))

# ── SECTION 9 : ROADMAP ──────────────────────────────────────────────────────
story += section_title("9. Roadmap")

roadmap = [
    ["Q4 2026", "Lancement Côte d'Ivoire & Sénégal · Visites virtuelles 360°"],
    ["Q1 2027", "Application mobile v2 · Signature électronique de contrats"],
    ["Q2 2027", "Expansion Mali, Togo, Bénin · Module agence immobilière"],
    ["Q3 2027", "Intelligence artificielle : estimation avancée · Chatbot multilingue"],
    ["2028", "Extension Afrique centrale & orientale · IPO régionale"],
]
rmt = Table(
    [["Période", "Objectifs"]] + roadmap,
    colWidths=[3*cm, 12.5*cm],
    style=TableStyle([
        ("BACKGROUND",    (0,0), (-1,0), GREEN),
        ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
        ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [LIGHT_GREEN, WHITE]),
        ("GRID",          (0,0), (-1,-1), 0.3, HexColor("#CCCCCC")),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("FONTNAME",      (0,0), (0,-1), "Helvetica-Bold"),
        ("TEXTCOLOR",     (0,1), (0,-1), GREEN),
    ])
)
story.append(rmt)

# ── SECTION 10 : CONTACTS ────────────────────────────────────────────────────
story += section_title("10. Contacts & Informations")

contacts = [
    ["Société", "Africa DEV YAZID CONSULTING"],
    ["Siège", "Ouagadougou, Burkina Faso"],
    ["Site", "www.immoafrica.online"],
    ["Email", "contact@immoafrica.online"],
    ["Android", "play.google.com/store/apps/details?id=africa.immobf.app"],
    ["iOS", "apps.apple.com/app/id6809453557"],
    ["GitHub", "github.com/FasoImmo/immobf-africa"],
]
story.append(kv_table(contacts))

story.append(Spacer(1, 0.5*cm))
story.append(Paragraph(
    "Document confidentiel — ImmoBF Africa © 2026 Africa DEV YAZID CONSULTING. "
    "Tous droits réservés. Reproduction interdite sans autorisation écrite.",
    ParagraphStyle("Footer", fontSize=8, fontName="Helvetica", textColor=GREY,
                   alignment=TA_CENTER)
))

# ── Génération ────────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=1.5*cm, rightMargin=1.5*cm,
    topMargin=2.8*cm, bottomMargin=1.5*cm,
    title="ImmoBF Africa — Fiche Technique",
    author="Africa DEV YAZID CONSULTING",
    subject="Plateforme Immobilière Africaine",
)
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"✅ Fiche technique générée → {OUT}")
